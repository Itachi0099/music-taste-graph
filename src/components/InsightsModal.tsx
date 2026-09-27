import React from 'react';
import { X, Activity, Compass, Disc, Zap } from 'lucide-react';
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
  isDark = true,
}) => {
  if (!isOpen || !summary) return null;

  const profile = summary.tasteProfile;
  const explorationPercent = profile ? Math.round(profile.explorationScore * 100) : 65;
  const diversityPercent = profile ? Math.round(profile.diversityScore * 100) : 70;
  const concentrationPercent = profile ? Math.round(profile.artistConcentration * 100) : 40;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl p-7 text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-150 max-h-[88vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-5 border-b border-[var(--border-subtle)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
                Personal Taste Profile & Observatory
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <h2 className="font-serif text-3xl font-bold tracking-tight mt-1 text-[var(--text-primary)]">
              {summary.tastePersona || 'Eclectic Explorer'}
            </h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-1 font-mono">
              {summary.totalTracks} tracks · {summary.totalArtists} artists · {summary.totalGenres} stellar systems
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="py-5 space-y-6">
          {/* Derived Behavioral Dimension Cards */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
              <Compass size={13} />
              <span>What Kind of Listener Are You?</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-[var(--text-primary)]">Exploration</span>
                  <span className="font-mono text-amber-400 text-[11px]">{explorationPercent}%</span>
                </div>
                <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${explorationPercent}%` }} />
                </div>
                <p className="text-[10.5px] text-[var(--text-tertiary)] leading-snug">
                  {explorationPercent > 70 
                    ? 'Cosmic voyager: frequently ventures outside familiar stellar systems.' 
                    : 'Orbit loyalist: prefers deepening ties with core musical suns.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-[var(--text-primary)]">Genre Diversity</span>
                  <span className="font-mono text-cyan-400 text-[11px]">{diversityPercent}%</span>
                </div>
                <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${diversityPercent}%` }} />
                </div>
                <p className="text-[10.5px] text-[var(--text-tertiary)] leading-snug">
                  {diversityPercent > 65
                    ? 'High entropy: spans multiple distinct galactic clusters simultaneously.'
                    : 'Focused gravitational pull: centered around a few primary genres.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-[var(--text-primary)]">Artist Concentration</span>
                  <span className="font-mono text-purple-400 text-[11px]">{concentrationPercent}%</span>
                </div>
                <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-purple-400 rounded-full" style={{ width: `${concentrationPercent}%` }} />
                </div>
                <p className="text-[10.5px] text-[var(--text-tertiary)] leading-snug">
                  {concentrationPercent > 50
                    ? 'Heavy artist affinity: clusters repeatedly around key stars.'
                    : 'Distributed catalog: broad listening across many individual stars.'}
                </p>
              </div>
            </div>
          </div>

          {/* Dominant Genres Distribution */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
              <Disc size={13} />
              <span>Stellar Gravity & Dominant Genres</span>
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
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${g.percentage}%`, backgroundColor: palette.dot }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sonic Vibe Profile */}
          {profile && (
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
                <Activity size={13} />
                <span>Audio Profile & Velocity</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] text-center">
                  <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase block mb-1">Energy</span>
                  <span className="font-serif text-xl font-semibold text-[var(--text-primary)]">{profile.energyProfile}%</span>
                </div>
                <div className="p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] text-center">
                  <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase block mb-1">Groove</span>
                  <span className="font-serif text-xl font-semibold text-[var(--text-primary)]">{profile.grooveProfile}%</span>
                </div>
                <div className="p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] text-center">
                  <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase block mb-1">Chill</span>
                  <span className="font-serif text-xl font-semibold text-[var(--text-primary)]">{profile.chillProfile}%</span>
                </div>
                <div className="p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] text-center">
                  <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase block mb-1">Preferred BPM</span>
                  <span className="font-serif text-xl font-semibold text-[var(--text-primary)]">{profile.bpmRange.preferred}</span>
                </div>
              </div>
            </div>
          )}

          {/* Tempo Distribution */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
              <Zap size={13} />
              <span>Tempo Spectrum</span>
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {summary.bpmDistribution.map(b => (
                <div key={b.range} className="p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)] text-center">
                  <span className="font-serif text-xl font-semibold text-[var(--text-primary)] block">
                    {b.count}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] font-mono mt-0.5 block truncate">
                    {b.range.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-muted)] font-mono">
            Derived deterministically from real music data
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Close Observatory
          </button>
        </div>
      </div>
    </div>
  );
};
