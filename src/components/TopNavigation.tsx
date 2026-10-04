import React, { useState } from 'react';
import { Search, Sparkles, Upload, MoreHorizontal, Sun, Moon, Radio, RefreshCw } from 'lucide-react';
import { loginWithSpotify } from '../utils/spotify';
import type { SpotifyStatusInfo, SpotifyPlaybackState } from '../types';

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
  spotifyStatus?: SpotifyStatusInfo;
  playbackState?: SpotifyPlaybackState | null;
  onManualSpotifyRefresh?: () => void;
  isRefreshingSpotify?: boolean;
  onDisconnectSpotify?: () => void;
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
  spotifyStatus,
  playbackState,
  onManualSpotifyRefresh,
  isRefreshingSpotify = false,
  onDisconnectSpotify,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleSpotifyConnect = async () => {
    try {
      setIsConnecting(true);
      await loginWithSpotify();
    } catch (err: unknown) {
      console.error('Spotify login error:', err);
      const msg = err instanceof Error ? err.message : 'Could not initiate Spotify connection';
      alert(`Spotify Connection: ${msg}`);
      setIsConnecting(false);
    }
  };

  // Status badge styling based on Spotify connection state
  const isConnected = spotifyStatus && spotifyStatus.state !== 'disconnected';
  const isLive = spotifyStatus?.state === 'live' || (playbackState?.isPlaying);

  return (
    <header className="h-14 border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-4 md:px-8 flex items-center justify-between select-none relative z-30 transition-colors">
      {/* Left: Wordmark & Spotify Live Status indicator */}
      <div className="flex items-center gap-4">
        <span className="font-serif text-lg font-bold tracking-tight text-[var(--text-primary)]">
          SymphonyGraph
        </span>

        {/* Ambient Spotify stream status badge with verified user identity */}
        {isConnected ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLive
                  ? 'bg-emerald-400 animate-pulse'
                  : spotifyStatus.state === 'connecting' || spotifyStatus.state === 'syncing'
                  ? 'bg-blue-400 animate-pulse'
                  : spotifyStatus.state === 'access_denied'
                  ? 'bg-rose-400'
                  : spotifyStatus.state === 'unauthorized' || spotifyStatus.state === 'error' || spotifyStatus.state === 'offline' || spotifyStatus.state === 'network_error'
                  ? 'bg-rose-400'
                  : spotifyStatus.state === 'rate_limited' || spotifyStatus.state === 'empty_library'
                  ? 'bg-amber-400'
                  : 'bg-emerald-500/60'
              }`}
            />
            <span className="hidden sm:inline">
              {playbackState?.isPlaying && playbackState.trackTitle
                ? `${playbackState.trackTitle} · ${playbackState.artistName}`
                : spotifyStatus.label}
              {spotifyStatus.userName || spotifyStatus.userId ? (
                <span className="text-[var(--text-tertiary)] ml-1 pl-1 border-l border-[var(--border-subtle)]">
                  {spotifyStatus.userName || spotifyStatus.userId}
                </span>
              ) : null}
            </span>
            <span className="sm:hidden">
              {isLive
                ? 'Live'
                : spotifyStatus.state === 'access_denied'
                ? 'Access unavailable'
                : spotifyStatus.state === 'unauthorized'
                ? 'Reconnect'
                : spotifyStatus.state === 'connecting'
                ? 'Connecting'
                : spotifyStatus.state === 'syncing'
                ? 'Syncing'
                : spotifyStatus.state === 'rate_limited'
                ? 'Rate limited'
                : spotifyStatus.state === 'offline' || spotifyStatus.state === 'network_error'
                ? 'Offline'
                : spotifyStatus.state === 'error'
                ? 'Error'
                : spotifyStatus.state === 'empty_library'
                ? 'Connected'
                : 'Synced'}
            </span>

            {onManualSpotifyRefresh && (
              <button
                onClick={onManualSpotifyRefresh}
                disabled={isRefreshingSpotify}
                className="ml-1 p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
                title="Refresh Spotify history now"
              >
                <RefreshCw size={11} className={isRefreshingSpotify ? 'animate-spin' : ''} />
              </button>
            )}
          </div>
        ) : null}
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
          <option value="spotify" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Spotify Stream</option>
          <option value="" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Custom Library</option>
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

        {/* Continuous Stream status instead of mandatory sync */}
        {!isConnected ? (
          <button
            onClick={handleSpotifyConnect}
            disabled={isConnecting}
            className="px-3 py-1.5 rounded bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90 font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Radio size={12} className={isConnecting ? 'animate-pulse' : ''} />
            <span>{isConnecting ? 'Connecting...' : 'Connect Spotify'}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {isLive ? (
              <div className="hidden lg:flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] font-mono pl-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Spotify Live</span>
              </div>
            ) : null}
            {onDisconnectSpotify && (
              <button
                onClick={onDisconnectSpotify}
                className="px-2 py-1 rounded text-[11px] font-mono text-[var(--text-tertiary)] hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                title="Disconnect Spotify session"
              >
                Disconnect
              </button>
            )}
          </div>
        )}

        {/* Overflow for mobile */}
        <div className="relative sm:hidden">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            <MoreHorizontal size={16} />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-44 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg shadow-lg py-1 z-50">
              <button
                onClick={() => { onOpenRecommendations(); setShowMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] flex items-center gap-2"
              >
                <Sparkles size={12} className="text-amber-400" />
                <span>Discoveries</span>
              </button>
              <button
                onClick={() => { onOpenInsights(); setShowMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
              >
                Insights
              </button>
              {!isConnected ? (
                <button
                  onClick={() => { setShowMenu(false); handleSpotifyConnect(); }}
                  disabled={isConnecting}
                  className="w-full text-left px-3 py-1.5 text-xs text-emerald-400 hover:bg-[var(--bg-surface)] disabled:opacity-50"
                >
                  {isConnecting ? 'Connecting...' : 'Connect Spotify'}
                </button>
              ) : onDisconnectSpotify ? (
                <button
                  onClick={() => { onDisconnectSpotify(); setShowMenu(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:bg-[var(--bg-surface)]"
                >
                  Disconnect Spotify
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
