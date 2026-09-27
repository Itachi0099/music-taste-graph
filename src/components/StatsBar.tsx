import React from 'react';
import { Layers, Users, Disc, Activity } from 'lucide-react';
import type { TasteSummary } from '../types';

interface StatsBarProps {
  summary: TasteSummary | null;
}

export const StatsBar: React.FC<StatsBarProps> = ({ summary }) => {
  if (!summary) return null;

  return (
    <div className="flex items-center justify-around px-6 py-3 bg-zinc-950 border-b border-slate-800 text-sm">
      <div className="flex items-center gap-2">
        <Disc size={16} className="text-neon-emerald" />
        <span className="text-slate-400">Tracks:</span>
        <span className="font-semibold text-slate-100">{summary.totalTracks}</span>
      </div>
      <div className="h-4 w-px bg-slate-700"></div>
      <div className="flex items-center gap-2">
        <Users size={16} className="text-neon-cyan" />
        <span className="text-slate-400">Artists:</span>
        <span className="font-semibold text-slate-100">{summary.totalArtists}</span>
      </div>
      <div className="h-4 w-px bg-slate-700"></div>
      <div className="flex items-center gap-2">
        <Layers size={16} className="text-neon-purple" />
        <span className="text-slate-400">Genres:</span>
        <span className="font-semibold text-slate-100">{summary.totalGenres}</span>
      </div>
      <div className="h-4 w-px bg-slate-700"></div>
      <div className="flex items-center gap-2">
        <Activity size={16} className="text-amber-400" />
        <span className="text-slate-400">Avg BPM:</span>
        <span className="font-semibold text-slate-100">{summary.averageBpm > 0 ? summary.averageBpm : '--'}</span>
      </div>
      <div className="h-4 w-px bg-slate-700"></div>
      <div className="flex items-center gap-2">
        <span className="text-slate-400">Persona:</span>
        <span className="font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs border border-slate-700">
          {summary.tastePersona || 'Unknown'}
        </span>
      </div>
    </div>
  );
};

