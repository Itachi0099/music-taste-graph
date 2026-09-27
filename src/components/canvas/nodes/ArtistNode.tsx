import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { GraphNodeData } from '../../../types';

interface ArtistNodeProps {
  data: GraphNodeData;
}

export const ArtistNode: React.FC<ArtistNodeProps> = ({ data }) => {
  const isExpanded = Boolean(data.expanded);
  const isSelected = Boolean(data.selected);
  const isDimmed = Boolean(data.dimmed);

  return (
    <div 
      className={`group relative px-4 py-2.5 rounded-lg border bg-[var(--bg-card)] text-left cursor-pointer select-none min-w-[165px] max-w-[220px] transition-all duration-200 ${
        isSelected
          ? 'border-[var(--text-primary)] ring-2 ring-[var(--text-primary)] shadow-lg scale-105'
          : 'border-[var(--border-primary)] hover:border-[var(--border-hover)] shadow-sm hover:shadow-md'
      }`}
      style={{
        opacity: isDimmed ? 0.2 : 1,
        transition: 'transform 0.2s ease, opacity 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0 !w-1 !h-1" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-1 !h-1" />
      <Handle type="target" id="left" position={Position.Left} className="!opacity-0 !w-1 !h-1" />
      <Handle type="source" id="right" position={Position.Right} className="!opacity-0 !w-1 !h-1" />

      <div className="flex items-center justify-between gap-2.5">
        <span className="font-sans font-semibold text-[13px] text-[var(--text-primary)] truncate leading-snug">
          {data.label}
        </span>
        {data.count !== undefined && (
          <span className="text-[11px] text-[var(--text-tertiary)] font-mono tabular-nums flex-shrink-0">
            {data.count}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-1 pt-1 border-t border-[var(--border-subtle)] text-[10.5px]">
        <span className="text-[var(--text-tertiary)] truncate max-w-[95px] font-mono">
          {data.genre}
        </span>
        <span className="text-[9.5px] font-mono text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
          {isExpanded ? 'Hide tracks' : 'Reveal tracks'}
        </span>
      </div>
    </div>
  );
};
