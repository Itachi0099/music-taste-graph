import React from 'react';
import { Disc3, Users, Radio, Activity, Sparkles } from 'lucide-react';
import type { TasteSummary } from '../types';

interface StatsBarProps {
  summary: TasteSummary | null;
}

export const StatsBar: React.FC<StatsBarProps> = ({ summary }) => {
  if (!summary) return null;

  return (
    <div className="flex items-center justify-between px-6 py-2 bg-slate-950/95 border-b border-white/5 text-xs text-slate-300 backdrop-blur-md">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-cyan-500/10 text-cyan-400">
            <Disc3 size={14} />
          </div>
          <span className="text-slate-400 font-medium">Tracks:</span>
          <span className="font-semibold text-slate-100 font-mono">{summary.totalTracks}</span>
        </div>

        <div className="h-3 w-px bg-white/10" />

        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-indigo-500/10 text-indigo-400">
            <Users size={14} />
          </div>
          <span className="text-slate-400 font-medium">Artists:</span>
          <span className="font-semibold text-slate-100 font-mono">{summary.totalArtists}</span>
        </div>

        <div className="h-3 w-px bg-white/10" />

        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-purple-500/10 text-purple-400">
            <Radio size={14} />
          </div>
          <span className="text-slate-400 font-medium">Genres:</span>
          <span className="font-semibold text-slate-100 font-mono">{summary.totalGenres}</span>
        </div>

        <div className="h-3 w-px bg-white/10" />

        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-amber-500/10 text-amber-400">
            <Activity size={14} />
          </div>
          <span className="text-slate-400 font-medium">Tempo:</span>
          <span className="font-semibold text-slate-100 font-mono">
            {summary.averageBpm > 0 ? `${summary.averageBpm} BPM` : 'Adaptive'}
          </span>
        </div>
      </div>

      {/* Mood Spectrum & Sonic Identity Pill */}
      <div className="hidden sm:flex items-center gap-3">
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <Sparkles size={12} className="text-pink-400" />
          Mood Harmony:
        </span>
        <span className="px-2.5 py-0.5 rounded-full bg-pink-500/10 text-pink-300 font-medium text-xs border border-pink-500/20">
          {summary.dominantMood}
        </span>
      </div>
    </div>
  );
};
