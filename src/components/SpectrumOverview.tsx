import React from 'react';
import { 
  Zap, 
  Activity, 
  Smile, 
  Flame, 
  Compass
} from 'lucide-react';
import type { TasteSummary } from '../types';

interface SpectrumOverviewProps {
  summary: TasteSummary | null;
  activeSpectrum: 'energy' | 'mood' | 'tempo';
  onChangeSpectrum: (spectrum: 'energy' | 'mood' | 'tempo') => void;
}

export const SpectrumOverview: React.FC<SpectrumOverviewProps> = ({
  summary,
  activeSpectrum,
  onChangeSpectrum,
}) => {
  if (!summary) return null;

  const energy = summary.energyScore || 50;

  return (
    <div className="w-full bg-slate-950/80 border-b border-white/5 backdrop-blur-xl px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 select-none">
      {/* Left: Quick Spectrum Mode Tabs */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5 mr-1">
          <Activity size={13} className="text-cyan-400" />
          Spectrum
        </span>
        <div className="flex items-center bg-white/5 p-0.5 rounded-lg border border-white/5 text-xs">
          <button
            onClick={() => onChangeSpectrum('energy')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium ${
              activeSpectrum === 'energy'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame size={12} />
            Energy Pulse
          </button>
          <button
            onClick={() => onChangeSpectrum('mood')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium ${
              activeSpectrum === 'mood'
                ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-sm shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smile size={12} />
            Mood Chromatics
          </button>
          <button
            onClick={() => onChangeSpectrum('tempo')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium ${
              activeSpectrum === 'tempo'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap size={12} />
            BPM Heatmap
          </button>
        </div>
      </div>

      {/* Middle: Active Visual Spectrum Bar */}
      <div className="flex-1 max-w-xl mx-auto px-4 min-w-[280px]">
        {activeSpectrum === 'energy' && (
          <div className="flex items-center gap-3">
            <span className="text-[10.5px] font-mono text-cyan-300">Ambient (10%)</span>
            <div className="flex-1 relative">
              {/* Spectrum gradient bar */}
              <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden relative border border-white/10">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 via-amber-400 to-rose-500 transition-all duration-700 rounded-full"
                  style={{ width: `${energy}%` }}
                />
              </div>
              {/* Target Indicator pointer */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-slate-950 shadow-md shadow-black transition-all duration-700"
                style={{ left: `${Math.min(97, Math.max(3, energy))}%` }}
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300">
              <span>{energy}%</span>
              <span className="text-[10px] font-normal text-slate-400 font-sans">Intensity</span>
            </div>
          </div>
        )}

        {activeSpectrum === 'mood' && (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex h-2.5 rounded-full overflow-hidden border border-white/10 bg-slate-800">
              {summary.moodBreakdown.map((item, idx) => (
                <div
                  key={idx}
                  title={`${item.mood}: ${item.percentage}%`}
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.color,
                  }}
                  className="h-full hover:opacity-90 transition-opacity"
                />
              ))}
            </div>
            <span className="text-xs font-medium text-slate-300 whitespace-nowrap">
              Primary: <strong className="text-cyan-300 font-semibold">{summary.dominantMood}</strong>
            </span>
          </div>
        )}

        {activeSpectrum === 'tempo' && (
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-1.5">
              {summary.bpmDistribution.map((item, idx) => {
                const max = Math.max(...summary.bpmDistribution.map(b => b.count), 1);
                const heightPercent = Math.max(15, (item.count / max) * 100);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group relative">
                    <div className="h-5 w-full bg-slate-800/80 rounded-sm flex items-end p-0.5 overflow-hidden border border-white/5">
                      <div 
                        className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 rounded-sm transition-all duration-500"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 mt-1 truncate max-w-[65px]">
                      {item.range.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 whitespace-nowrap">
              {summary.averageBpm} BPM Avg
            </span>
          </div>
        )}
      </div>

      {/* Right: Quick Persona Pill */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-400">Persona:</span>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold tracking-wide">
          <Compass size={13} className="text-indigo-400" />
          {summary.tastePersona || 'Eclectic Explorer'}
        </div>
      </div>
    </div>
  );
};
