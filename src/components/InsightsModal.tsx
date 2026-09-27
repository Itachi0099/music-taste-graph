import React from 'react';
import { X } from 'lucide-react';
import type { TasteSummary } from '../types';
import { getGenreColor } from '../utils/colors';

interface InsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: TasteSummary | null;
  isDark?: boolean;
}

export const InsightsModal: React.FC<InsightsModalProps> = ({ 
  isOpen, 
  onClose, 
  summary,
  isDark = false,
}) => {
  if (!isOpen || !summary) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl p-8 text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between pb-6 border-b border-[var(--border-subtle)]">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
              Listening Profile
            </span>
            <h2 className="font-serif text-3xl font-semibold tracking-tight mt-1 text-[var(--text-primary)]">
              {summary.tastePersona || 'Eclectic Explorer'}
            </h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-1 font-mono">
              {summary.totalTracks} tracks · {summary.totalArtists} artists · {summary.totalGenres} genres
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="py-6 space-y-8">
          {/* Genre Distribution */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] mb-3">
              Dominant Genres
            </h3>
            <div className="space-y-2">
              {summary.topGenres.map(g => {
                const palette = getGenreColor(g.genre, isDark);
                return (
                  <div key={g.genre} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[var(--text-primary)]">{g.genre}</span>
                      <span className="font-mono text-[var(--text-tertiary)]">{g.count} tracks ({g.percentage}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-[var(--bg-surface)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                      <div 
                        className="h-full rounded-full"
                        style={{ width: `${g.percentage}%`, backgroundColor: palette.dot }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tempo & Rhythm */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] mb-3">
              Tempo Distribution
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {summary.bpmDistribution.map(b => (
                <div key={b.range} className="p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)] text-center">
                  <span className="font-serif text-xl font-semibold text-[var(--text-primary)] block">
                    {b.count}
                  </span>
                  <span className="text-[10.5px] text-[var(--text-tertiary)] font-mono mt-0.5 block truncate">
                    {b.range.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Atmosphere Breakdown */}
          {summary.moodBreakdown && summary.moodBreakdown.length > 0 && (
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] mb-3">
                Atmosphere & Mood
              </h3>
              <div className="flex flex-wrap gap-2">
                {summary.moodBreakdown.map(m => (
                  <div 
                    key={m.mood}
                    className="px-3 py-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border-primary)] text-xs flex items-center gap-2"
                  >
                    <span className="text-[var(--text-primary)] font-medium">{m.mood}</span>
                    <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{m.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-[var(--border-subtle)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Close Insights
          </button>
        </div>
      </div>
    </div>
  );
};
