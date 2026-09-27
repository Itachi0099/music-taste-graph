import React, { useState } from 'react';
import { 
  Search, 
  Upload, 
  Download, 
  Sparkles, 
  PlusCircle, 
  Music,
  X
} from 'lucide-react';
import { loginWithSpotify } from '../utils/spotify';

interface HeaderProps {
  preset: string;
  onPresetChange: (val: string) => void;
  onImportClick: () => void;
  onExportClick: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onQuickAddTrack: (track: { track: string; artist: string; genre: string; bpm?: number | null }) => void;
  showDiscoveries: boolean;
  onToggleDiscoveries: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  preset, 
  onPresetChange, 
  onImportClick, 
  onExportClick,
  searchQuery,
  onSearchChange,
  onQuickAddTrack,
  showDiscoveries,
  onToggleDiscoveries
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTrack, setNewTrack] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [newGenre, setNewGenre] = useState('');
  const [newBpm, setNewBpm] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrack.trim() || !newArtist.trim() || !newGenre.trim()) return;

    onQuickAddTrack({
      track: newTrack.trim(),
      artist: newArtist.trim(),
      genre: newGenre.trim(),
      bpm: newBpm ? Number(newBpm) : null,
    });

    setNewTrack('');
    setNewArtist('');
    setNewGenre('');
    setNewBpm('');
    setShowAddModal(false);
  };

  return (
    <header className="flex flex-wrap items-center justify-between px-6 py-3 bg-slate-950/90 border-b border-white/5 backdrop-blur-xl relative z-30">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 p-0.5 shadow-md shadow-cyan-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-cyan-400">
            <Music size={18} />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold font-display tracking-tight text-white">
              SymphonyGraph
            </h1>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-cyan-300 border border-white/10">
              v2.0
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Music Topology & Recommendation Engine</p>
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="flex items-center gap-2 flex-1 max-w-sm mx-4">
        <div className="relative w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Real-time filter artists, songs, genres..."
            className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Real-time Quick Add Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all hover:scale-102"
        >
          <PlusCircle size={14} />
          <span>Add Node</span>
        </button>

        {/* Discovery Drawer Toggle */}
        <button
          onClick={onToggleDiscoveries}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            showDiscoveries
              ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white border-transparent shadow-md shadow-indigo-500/25'
              : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
          }`}
        >
          <Sparkles size={13} className={showDiscoveries ? 'text-amber-300' : 'text-slate-400'} />
          <span>Discoveries</span>
        </button>

        {/* Preset Selector */}
        <select 
          value={preset}
          onChange={(e) => onPresetChange(e.target.value)}
          aria-label="Preset taste dataset"
          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
        >
          <option value="electronic" className="bg-slate-900 text-slate-200">Electronic / Club</option>
          <option value="indie" className="bg-slate-900 text-slate-200">Indie / Alternative</option>
          <option value="eclectic" className="bg-slate-900 text-slate-200">Eclectic Mix</option>
          <option value="" className="bg-slate-900 text-slate-200">Custom Dataset</option>
        </select>

        {/* Spotify Sync */}
        <button 
          onClick={loginWithSpotify}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1DB954]/15 text-[#1ed760] hover:bg-[#1DB954]/25 transition-all text-xs font-medium border border-[#1DB954]/30"
          title="Authenticate with Spotify"
        >
          <span>Spotify Sync</span>
        </button>

        {/* Import & Export */}
        <button 
          onClick={onImportClick}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-xs font-medium border border-white/10"
          title="Import CSV or JSON"
        >
          <Upload size={13} />
          <span>Import</span>
        </button>

        <button 
          onClick={onExportClick}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-xs font-medium border border-white/10"
          title="Export high-res diagram image"
        >
          <Download size={13} />
          <span>Export</span>
        </button>
      </div>

      {/* Quick Add Node Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl w-full max-w-sm p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <PlusCircle size={16} className="text-cyan-400" />
                <h3 className="text-sm font-bold font-display text-white">Add Music Entity</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-[10.5px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Track Title *
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Midnight City"
                  value={newTrack}
                  onChange={(e) => setNewTrack(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[10.5px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Artist *
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. M83"
                  value={newArtist}
                  onChange={(e) => setNewArtist(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10.5px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                    Genre *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Synth-pop"
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                    BPM (Optional)
                  </label>
                  <input 
                    type="number"
                    placeholder="e.g. 105"
                    value={newBpm}
                    onChange={(e) => setNewBpm(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20"
                >
                  Add Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
