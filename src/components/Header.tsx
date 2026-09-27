import React from 'react';
import { Search, Upload, Download, Music } from 'lucide-react';
import { loginWithSpotify } from '../utils/spotify';

interface HeaderProps {
  preset: string;
  onPresetChange: (val: string) => void;
  onImportClick: () => void;
  onExportClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ preset, onPresetChange, onImportClick, onExportClick }) => {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-700">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-neon-purple/20 text-neon-purple">
          <Music size={24} />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Music Taste Graph</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative mr-2">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search artists, genres..."
            className="pl-10 pr-4 py-2 rounded-md bg-slate-800 border border-slate-700 text-sm focus:outline-none focus:ring-1 focus:ring-neon-cyan transition-colors w-48"
          />
        </div>

        <select 
          value={preset}
          onChange={(e) => onPresetChange(e.target.value)}
          className="px-4 py-2 rounded-md bg-slate-800 border border-slate-700 text-sm focus:outline-none focus:ring-1 focus:ring-neon-cyan cursor-pointer"
        >
          <option value="">Load Preset...</option>
          <option value="electronic">Electronic / Club</option>
          <option value="indie">Indie / Alternative</option>
          <option value="eclectic">Eclectic Mix</option>
        </select>

        <button 
          onClick={loginWithSpotify}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#1DB954]/20 text-[#1DB954] hover:bg-[#1DB954]/30 transition-colors text-sm font-medium border border-[#1DB954]/40"
        >
          Spotify Sync
        </button>

        <button 
          onClick={onImportClick}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 transition-colors text-sm font-medium border border-neon-cyan/30"
        >
          <Upload size={16} />
          Import
        </button>

        <button 
          onClick={onExportClick}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors text-sm font-medium border border-slate-700"
        >
          <Download size={16} />
          Export
        </button>
      </div>
    </header>
  );
};

