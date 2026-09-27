import React from 'react';
import type { DiscoveryCategory, CelestialDiscoverySystem } from '../types';
import { Sparkles, Zap, X } from 'lucide-react';

interface DiscoveryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  discoveries: CelestialDiscoverySystem[];
  activeCategory: DiscoveryCategory | 'all';
  onCategoryChange: (category: DiscoveryCategory | 'all') => void;
  onSelectDiscovery: (discovery: CelestialDiscoverySystem) => void;
}

export const DiscoveryPanel: React.FC<DiscoveryPanelProps> = ({
  isOpen,
  onClose,
  discoveries,
  activeCategory,
  onCategoryChange,
  onSelectDiscovery,
}) => {
  if (!isOpen) return null;

  // Counts by category
  const nearbyCount = discoveries.filter((d) => d.recommendation.category === 'nearby').length;
  const adjacentCount = discoveries.filter((d) => d.recommendation.category === 'adjacent').length;
  const unknownCount = discoveries.filter((d) => d.recommendation.category === 'unknown').length;

  const filteredDiscoveries = activeCategory === 'all'
    ? discoveries
    : discoveries.filter((d) => d.recommendation.category === activeCategory);

  return (
    <aside className="fixed z-40 bg-[var(--bg-primary)] border-[var(--border-primary)] shadow-2xl flex flex-col overflow-hidden transition-all bottom-0 inset-x-0 max-h-[75vh] rounded-t-2xl border-t animate-in slide-in-from-bottom duration-200 md:bottom-auto md:top-0 md:right-0 md:left-auto md:w-full md:max-w-sm md:h-full md:max-h-full md:rounded-none md:border-t-0 md:border-l md:slide-in-from-right">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border-primary)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-amber-400" />
          <h2 className="font-serif text-lg font-bold tracking-tight text-[var(--text-primary)]">
            Discover
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
          title="Close Discover panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Discovery Category Filters */}
      <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="grid grid-cols-4 gap-1.5 text-xs">
          <button
            onClick={() => onCategoryChange('all')}
            className={`py-1.5 px-2 rounded font-medium transition-all ${
              activeCategory === 'all'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            All ({discoveries.length})
          </button>
          <button
            onClick={() => onCategoryChange('nearby')}
            className={`py-1.5 px-2 rounded font-medium transition-all ${
              activeCategory === 'nearby'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Nearby ({nearbyCount})
          </button>
          <button
            onClick={() => onCategoryChange('adjacent')}
            className={`py-1.5 px-2 rounded font-medium transition-all ${
              activeCategory === 'adjacent'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Adjacent ({adjacentCount})
          </button>
          <button
            onClick={() => onCategoryChange('unknown')}
            className={`py-1.5 px-2 rounded font-medium transition-all ${
              activeCategory === 'unknown'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Unknown ({unknownCount})
          </button>
        </div>

        <p className="text-[11px] text-[var(--text-muted)] font-mono mt-2.5 leading-snug">
          {activeCategory === 'all' && 'Celestial discovery systems positioned by taste similarity.'}
          {activeCategory === 'nearby' && 'High similarity (82%+). Close orbital distance to your genres.'}
          {activeCategory === 'adjacent' && 'Medium similarity (65–81%). Bridges to unfamiliar sounds.'}
          {activeCategory === 'unknown' && 'Distant frontiers. Outside your normal orbit.'}
        </p>
      </div>

      {/* Discovery List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {filteredDiscoveries.map((disc) => (
          <div
            key={disc.id}
            onClick={() => {
              onSelectDiscovery(disc);
            }}
            className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--text-primary)] cursor-pointer group transition-all shadow-xs hover:shadow-md"
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-[var(--text-primary)] text-sm group-hover:text-amber-500 transition-colors">
                {disc.recommendation.artist}
              </span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)]">
                {Math.round(disc.recommendation.score * 100)}% Match
              </span>
            </div>

            <p className="text-xs text-[var(--text-secondary)] font-mono">
              {disc.recommendation.genre} · {disc.recommendation.subgenre}
            </p>

            <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
              <span className="text-[var(--text-muted)] font-mono uppercase text-[9.5px]">
                {disc.recommendation.category}
              </span>
              <span className="flex items-center gap-1 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors font-medium">
                <Zap size={11} className="text-sky-400" />
                <span>Travel to system →</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
