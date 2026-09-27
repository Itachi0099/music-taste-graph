import React, { useState } from 'react';
import { Search, Sparkles, Upload, MoreHorizontal, Sun, Moon } from 'lucide-react';
import { loginWithSpotify } from '../utils/spotify';

interface TopNavigationProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onImportClick: () => void;
  onOpenInsights: () => void;
  onOpenRecommendations: () => void;
  preset: string;
  onPresetChange: (val: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  searchQuery,
  onSearchChange,
  onImportClick,
  onOpenInsights,
  onOpenRecommendations,
  preset,
  onPresetChange,
  isDark,
  onToggleTheme,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="h-14 border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-6 md:px-10 flex items-center justify-between select-none relative z-30 transition-colors">
      {/* Left: Wordmark */}
      <div className="flex items-center gap-6">
        <span className="font-serif text-lg font-bold tracking-tight text-[var(--text-primary)]">
          SymphonyGraph
        </span>
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-sm mx-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search music, artists, genres..."
            className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[var(--bg-surface)] border border-transparent hover:border-[var(--border-primary)] focus:border-[var(--text-primary)] focus:bg-[var(--bg-card)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-all font-sans"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 md:gap-3 text-xs">
        {/* Preset Selector */}
        <select
          value={preset}
          onChange={(e) => onPresetChange(e.target.value)}
          aria-label="Preset music collection"
          className="hidden sm:block text-xs bg-transparent border-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer focus:outline-none pr-1"
        >
          <option value="electronic" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Electronic / Club</option>
          <option value="indie" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Indie / Alternative</option>
          <option value="eclectic" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Eclectic Mix</option>
          <option value="" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Custom</option>
        </select>

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          title={isDark ? "Switch to light theme" : "Switch to dark theme"}
          className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors flex items-center justify-center"
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button
          onClick={onOpenRecommendations}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
          title="Open Discovery Panel"
        >
          <Sparkles size={13} className="text-amber-400" />
          <span>Discover</span>
        </button>

        <button
          onClick={onOpenInsights}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
        >
          <span>Insights</span>
        </button>

        <button
          onClick={onImportClick}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
        >
          <Upload size={13} />
          <span className="hidden sm:inline">Import</span>
        </button>

        <button
          onClick={loginWithSpotify}
          className="px-3 py-1.5 rounded bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90 font-medium transition-all"
        >
          Spotify Sync
        </button>

        {/* Overflow for mobile */}
        <div className="relative sm:hidden">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            <MoreHorizontal size={16} />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-40 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg shadow-lg py-1 z-50">
              <button
                onClick={() => { onOpenRecommendations(); setShowMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
              >
                Discoveries
              </button>
              <button
                onClick={() => { onOpenInsights(); setShowMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
              >
                Insights
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
