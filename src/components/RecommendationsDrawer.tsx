import React from 'react';
import { X, Plus } from 'lucide-react';
import type { RecommendationItem } from '../types';
import { getGenreColor } from '../utils/colors';

interface RecommendationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recommendations: RecommendationItem[];
  selectedMood: string;
  onSelectMood: (mood: string) => void;
  availableMoods: string[];
  onAddRecommendation: (rec: RecommendationItem) => void;
  isDark?: boolean;
}

export const RecommendationsDrawer: React.FC<RecommendationsDrawerProps> = ({
  isOpen,
  onClose,
  recommendations,
  selectedMood,
  onSelectMood,
  availableMoods,
  onAddRecommendation,
  isDark = false,
}) => {
  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-[var(--bg-primary)] border-l border-[var(--border-primary)] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
      <div className="px-8 pt-7 pb-4 flex items-center justify-between border-b border-[var(--border-subtle)]">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
            Curated Discoveries
          </span>
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-[var(--text-primary)] mt-0.5">
            Similar Artists & Songs
          </h2>
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
        >
          <X size={18} />
        </button>
      </div>

      {/* Mood filter text links */}
      <div className="px-8 py-3 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
        <button
          onClick={() => onSelectMood('all')}
          className={`px-2 py-0.5 rounded transition-colors ${
            selectedMood === 'all'
              ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] font-medium'
              : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
          }`}
        >
          All
        </button>
        {availableMoods.map((mood) => (
          <button
            key={mood}
            onClick={() => onSelectMood(mood)}
            className={`px-2 py-0.5 rounded whitespace-nowrap transition-colors ${
              selectedMood === mood
                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] font-medium'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {mood}
          </button>
        ))}
      </div>

      {/* Recommendations Feed */}
      <div className="flex-1 overflow-y-auto px-8 py-4 divide-y divide-[var(--border-subtle)]">
        {recommendations.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)]">
            No matching discoveries for this filter.
          </div>
        ) : (
          recommendations.map((rec) => {
            const palette = getGenreColor(rec.genre, isDark);
            return (
              <div key={rec.id} className="py-3.5 flex items-start justify-between gap-3 group">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-xs text-[var(--text-primary)] truncate">
                      {rec.title}
                    </span>
                    <span className="text-[11px] text-[var(--text-tertiary)] truncate">
                      {rec.subtitle}
                    </span>
                  </div>

                  <p className="text-[11px] text-[var(--text-tertiary)] mt-1 leading-snug">
                    {rec.reason}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5 text-[10.5px]">
                    <span 
                      className="px-1.5 py-0.5 rounded border"
                      style={{ backgroundColor: palette.bg, borderColor: palette.border, color: palette.text }}
                    >
                      {rec.genre}
                    </span>
                    {rec.bpm && (
                      <span className="font-mono text-[var(--text-muted)]">{rec.bpm} bpm</span>
                    )}
                    <span className="text-[var(--text-muted)] font-mono">{rec.matchScore}% affinity</span>
                  </div>
                </div>

                <button
                  onClick={() => onAddRecommendation(rec)}
                  className="p-1.5 rounded border border-[var(--border-primary)] hover:border-[var(--text-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all flex items-center gap-1 text-[11px] font-medium flex-shrink-0"
                  title="Add to your music graph"
                >
                  <Plus size={12} />
                  <span>Add</span>
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
