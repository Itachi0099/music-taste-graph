import React from 'react';
import type { Node } from '@xyflow/react';
import { X, ArrowRight } from 'lucide-react';
import type { RawTrackRecord } from '../types';

interface DetailsDrawerProps {
  selectedNode: Node | null;
  records: RawTrackRecord[];
  onClose: () => void;
  onSelectArtist?: (artistName: string) => void;
  onSelectGenre?: (genreName: string) => void;
}

export const DetailsDrawer: React.FC<DetailsDrawerProps> = ({ 
  selectedNode, 
  records,
  onClose,
  onSelectArtist,
  onSelectGenre
}) => {
  if (!selectedNode) return null;

  const { type, data } = selectedNode;
  const label = data.label as string;

  // Common sheet wrapper: bottom-sheet on mobile (rounded-t-2xl max-h-[75vh]), side drawer on md+ desktop
  const drawerClasses = 
    "fixed z-40 bg-[var(--bg-primary)] border-[var(--border-primary)] shadow-2xl flex flex-col overflow-hidden transition-all " +
    "bottom-0 inset-x-0 max-h-[75vh] rounded-t-2xl border-t animate-in slide-in-from-bottom duration-200 " +
    "md:bottom-auto md:top-0 md:right-0 md:left-auto md:w-full md:max-w-md md:h-full md:max-h-full md:rounded-none md:border-t-0 md:border-l md:slide-in-from-right";

  if (type === 'artistNode') {
    const artistTracks = records.filter(r => r.artist.toLowerCase() === label.toLowerCase());
    const connectedGenres = Array.from(new Set(artistTracks.map(r => r.genre))).filter(Boolean);

    return (
      <aside className={drawerClasses}>
        {/* Mobile drag handle bar */}
        <div className="md:hidden w-10 h-1 bg-[var(--border-primary)] rounded-full mx-auto mt-2.5 mb-1" />

        <div className="px-6 md:px-8 pt-5 md:pt-7 pb-4 flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
            Artist
          </span>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
            title="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-10 space-y-6">
          <div>
            <h2 className="font-serif text-2xl md:text-3xl font-semibold tracking-tight text-[var(--text-primary)] leading-tight">
              {label}
            </h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-1 font-mono">
              {connectedGenres.length > 0 ? connectedGenres.join(' · ') : String(data.genre || '')}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {artistTracks.length} {artistTracks.length === 1 ? 'track' : 'tracks'} in your library
            </p>
          </div>

          {connectedGenres.length > 0 && (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-2 font-mono">
                Genres
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {connectedGenres.map(g => (
                  <button
                    key={g}
                    onClick={() => onSelectGenre && onSelectGenre(g)}
                    className="px-2.5 py-1 text-xs rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-primary)] transition-colors"
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-3 font-mono">
              Tracks in collection
            </h3>
            <div className="divide-y divide-[var(--border-subtle)] border-t border-b border-[var(--border-subtle)]">
              {artistTracks.map((t, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--text-secondary)]">
                    {t.track}
                  </span>
                  {t.bpm ? (
                    <span className="text-[11px] text-[var(--text-muted)] font-mono">
                      {t.bpm} bpm
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  if (type === 'genreNode') {
    const genreTracks = records.filter(r => r.genre.toLowerCase() === label.toLowerCase());
    const genreArtists = Array.from(new Set(genreTracks.map(r => r.artist))).filter(Boolean);

    return (
      <aside className={drawerClasses}>
        {/* Mobile drag handle bar */}
        <div className="md:hidden w-10 h-1 bg-[var(--border-primary)] rounded-full mx-auto mt-2.5 mb-1" />

        <div className="px-6 md:px-8 pt-5 md:pt-7 pb-4 flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
            Genre
          </span>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-10 space-y-6">
          <div>
            <h2 className="font-serif text-2xl md:text-3xl font-semibold tracking-tight text-[var(--text-primary)] leading-tight">
              {label}
            </h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-1 font-mono">
              {genreTracks.length} tracks · {genreArtists.length} artists
            </p>
          </div>

          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-3 font-mono">
              Key artists
            </h3>
            <div className="divide-y divide-[var(--border-subtle)] border-t border-b border-[var(--border-subtle)]">
              {genreArtists.map((artist, idx) => {
                const count = genreTracks.filter(t => t.artist === artist).length;
                return (
                  <button
                    key={idx}
                    onClick={() => onSelectArtist && onSelectArtist(artist)}
                    className="w-full py-2.5 flex items-center justify-between text-xs text-left group hover:text-[var(--text-primary)]"
                  >
                    <span className="font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
                      {artist}
                    </span>
                    <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                      <span className="font-mono text-[11px]">{count} tracks</span>
                      <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  if (type === 'trackNode') {
    const trackArtist = data.artist as string;
    const trackGenre = data.genre as string;

    return (
      <aside className={drawerClasses}>
        {/* Mobile drag handle bar */}
        <div className="md:hidden w-10 h-1 bg-[var(--border-primary)] rounded-full mx-auto mt-2.5 mb-1" />

        <div className="px-6 md:px-8 pt-5 md:pt-7 pb-4 flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
            Track
          </span>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-10 space-y-6">
          <div>
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-[var(--text-primary)] leading-tight">
              {label}
            </h2>
            <button 
              onClick={() => onSelectArtist && onSelectArtist(trackArtist)}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline mt-1 font-medium block"
            >
              {trackArtist}
            </button>
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-tertiary)]">Genre</span>
              <span className="font-medium text-[var(--text-primary)]">
                {trackGenre} {data.subgenre ? `· ${String(data.subgenre)}` : ''}
              </span>
            </div>
            {Boolean(data.album) && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-tertiary)]">Album</span>
                <span className="text-[var(--text-primary)] font-medium">
                  {String(data.album)} {data.year ? `(${String(data.year)})` : ''}
                </span>
              </div>
            )}
            {data.bpm ? (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-tertiary)]">Tempo</span>
                <span className="font-mono text-[var(--text-primary)]">{data.bpm as number} BPM</span>
              </div>
            ) : null}
            {Boolean(data.duration) && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-tertiary)]">Length</span>
                <span className="font-mono text-[var(--text-primary)]">{String(data.duration)}</span>
              </div>
            )}
            {data.mood ? (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-tertiary)]">Atmosphere</span>
                <span className="text-[var(--text-primary)]">{data.mood as string}</span>
              </div>
            ) : null}

            <div className="pt-2">
              <a
                href={
                  (data.spotifyUrl as string) ||
                  `https://open.spotify.com/search/${encodeURIComponent(`${trackArtist} ${label}`)}`
                }
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 px-3 rounded-md bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90 font-medium text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Open in Spotify</span>
                <ArrowRight size={13} />
              </a>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return null;
};
