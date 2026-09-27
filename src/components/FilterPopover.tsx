import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import type { TasteSummary } from '../types';

interface FilterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  summary: TasteSummary | null;
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
  selectedMood: string;
  onSelectMood: (mood: string) => void;
  minBpm: number;
  maxBpm: number;
  onBpmChange: (min: number, max: number) => void;
  onReset: () => void;
}

export const FilterPopover: React.FC<FilterPopoverProps> = ({
  isOpen,
  onClose,
  summary,
  selectedGenre,
  onSelectGenre,
  selectedMood,
  onSelectMood,
  minBpm,
  maxBpm,
  onBpmChange,
  onReset,
}) => {
  if (!isOpen) return null;

  const moods = ['Intense', 'Uplifting', 'Groovy', 'Calm', 'Nocturnal', 'Energetic', 'Nostalgic', 'Mellow'];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-start justify-end p-4 md:p-8">
      <div className="w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-2xl p-6 text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
          <h3 className="font-serif text-lg font-semibold tracking-tight">
            Filters
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex items-center gap-1"
            >
              <RotateCcw size={12} />
              Reset
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Filter Body */}
        <div className="py-4 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Genre Filter */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] block mb-2">
              Genres
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onSelectGenre('all')}
                className={`text-xs px-2.5 py-1 rounded transition-colors ${
                  selectedGenre === 'all'
                    ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] font-medium'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:opacity-85'
                }`}
              >
                All
              </button>
              {summary?.topGenres.map(g => (
                <button
                  key={g.genre}
                  onClick={() => onSelectGenre(selectedGenre === g.genre ? 'all' : g.genre)}
                  className={`text-xs px-2.5 py-1 rounded transition-colors ${
                    selectedGenre === g.genre
                      ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] font-medium'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:opacity-85'
                  }`}
                >
                  {g.genre}
                </button>
              ))}
            </div>
          </div>

          {/* Tempo BPM Filter */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-mono uppercase tracking-wider text-[var(--text-muted)]">Tempo Range</span>
              <span className="font-mono text-[var(--text-secondary)]">{minBpm} – {maxBpm} BPM</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="60"
                max="180"
                value={minBpm}
                onChange={(e) => onBpmChange(Number(e.target.value), maxBpm)}
                className="w-full accent-[var(--text-primary)]"
              />
              <input
                type="range"
                min="60"
                max="200"
                value={maxBpm}
                onChange={(e) => onBpmChange(minBpm, Number(e.target.value))}
                className="w-full accent-[var(--text-primary)]"
              />
            </div>
          </div>

          {/* Mood Filter */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] block mb-2">
              Atmosphere & Mood
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onSelectMood('all')}
                className={`text-xs px-2.5 py-1 rounded transition-colors ${
                  selectedMood === 'all'
                    ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] font-medium'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:opacity-85'
                }`}
              >
                All
              </button>
              {moods.map(m => (
                <button
                  key={m}
                  onClick={() => onSelectMood(selectedMood === m ? 'all' : m)}
                  className={`text-xs px-2.5 py-1 rounded transition-colors ${
                    selectedMood === m
                      ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] font-medium'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:opacity-85'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};
