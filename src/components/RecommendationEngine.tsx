import React from 'react';
import { 
  Sparkles, 
  Plus, 
  Compass, 
  Flame, 
  Headphones, 
  Filter
} from 'lucide-react';
import type { RecommendationItem } from '../types';
import { getGenreColor } from '../utils/colors';

interface RecommendationEngineProps {
  recommendations: RecommendationItem[];
  selectedMood: string;
  onSelectMood: (mood: string) => void;
  availableMoods: string[];
  onAddRecommendationToGraph: (item: RecommendationItem) => void;
}

export const RecommendationEngine: React.FC<RecommendationEngineProps> = ({
  recommendations,
  selectedMood,
  onSelectMood,
  availableMoods,
  onAddRecommendationToGraph
}) => {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 text-white shadow-md shadow-indigo-500/20">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide font-display text-slate-100 flex items-center gap-1.5">
              Sonic Discoveries
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                AI / Match Engine
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">Personalized similar artists, songs & mood affinity</p>
          </div>
        </div>
      </div>

      {/* Mood Spectrum Filter Pills */}
      <div className="px-4 py-2.5 bg-black/20 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <Filter size={12} className="text-slate-500 flex-shrink-0 mr-1" />
        <button
          onClick={() => onSelectMood('all')}
          className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
            selectedMood === 'all'
              ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm shadow-cyan-500/30'
              : 'bg-white/5 hover:bg-white/10 text-slate-400'
          }`}
        >
          All Moods
        </button>
        {availableMoods.map((mood) => (
          <button
            key={mood}
            onClick={() => onSelectMood(mood)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              selectedMood === mood
                ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold shadow-sm shadow-cyan-500/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            {mood}
          </button>
        ))}
      </div>

      {/* Discovery Feed List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {recommendations.length === 0 ? (
          <div className="p-6 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Compass size={24} className="text-slate-600 animate-pulse" />
            <p className="text-xs">No similar matches found for this mood.</p>
            <button 
              onClick={() => onSelectMood('all')}
              className="text-xs text-cyan-400 hover:underline"
            >
              Reset filter
            </button>
          </div>
        ) : (
          recommendations.map((rec) => {
            const colors = getGenreColor(rec.genre);
            return (
              <div 
                key={rec.id}
                className="group p-3 rounded-xl border border-white/5 bg-slate-900/60 hover:bg-slate-800/80 hover:border-white/15 transition-all duration-200 shadow-sm hover:shadow-lg relative overflow-hidden"
              >
                {/* Match Score Indicator bar */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{ backgroundColor: colors.border }}
                />

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-slate-100 text-xs truncate group-hover:text-cyan-300 transition-colors">
                        {rec.title}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">
                        • {rec.subtitle}
                      </span>
                    </div>

                    <p className="text-[10.5px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
                      <span className="text-cyan-400/90 font-medium">Why:</span> {rec.reason}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <span 
                        className="text-[9.5px] font-mono px-1.5 py-0.5 rounded border"
                        style={{
                          backgroundColor: `${colors.border}15`,
                          borderColor: `${colors.border}30`,
                          color: colors.text,
                        }}
                      >
                        {rec.genre}
                      </span>

                      {rec.bpm && (
                        <span className="text-[9.5px] text-slate-400 font-mono flex items-center gap-0.5">
                          {rec.bpm} BPM
                        </span>
                      )}

                      <span className="text-[9.5px] text-indigo-300/80 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                        {rec.mood}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      <Flame size={11} className="text-emerald-400" />
                      {rec.matchScore}%
                    </div>

                    <button
                      onClick={() => onAddRecommendationToGraph(rec)}
                      title="Add into graph canvas in real-time"
                      className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 border border-cyan-500/20 transition-all flex items-center gap-1 text-[10px] font-medium"
                    >
                      <Plus size={12} />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-black/30 border-t border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Headphones size={13} className="text-cyan-400" />
          Click <span className="text-cyan-300 font-medium">+ Add</span> to inject dynamically
        </span>
        <span className="text-[10px] font-mono text-slate-400">{recommendations.length} curated</span>
      </div>
    </div>
  );
};
