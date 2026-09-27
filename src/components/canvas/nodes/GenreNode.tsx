import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { GraphNodeData } from '../../../types';
import { getGenreColor } from '../../../utils/colors';

interface GenreNodeProps {
  data: GraphNodeData;
}

export const GenreNode: React.FC<GenreNodeProps> = ({ data }) => {
  const isDark = Boolean(data.isDark);
  const palette = getGenreColor(data.label, isDark);
  const isSelected = Boolean(data.selected);
  const isDimmed = Boolean(data.dimmed);

  return (
    <div 
      className={`group relative px-5 py-4 rounded-xl border-2 transition-all duration-200 cursor-pointer select-none text-left min-w-[210px] ${
        isSelected 
          ? 'shadow-xl scale-105 ring-2 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--bg-primary)]' 
          : 'shadow-sm hover:shadow-md hover:scale-[1.02]'
      }`}
      style={{
        backgroundColor: palette.bg,
        borderColor: isSelected ? 'var(--text-primary)' : palette.border,
        opacity: isDimmed ? 0.22 : 1,
        transition: 'transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* Invisible Handles on center edges for flexible organic connections */}
      <Handle type="target" position={Position.Top} className="!opacity-0 !w-1 !h-1" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-1 !h-1" />
      <Handle type="target" id="left" position={Position.Left} className="!opacity-0 !w-1 !h-1" />
      <Handle type="source" id="right" position={Position.Right} className="!opacity-0 !w-1 !h-1" />

      <div className="flex items-baseline justify-between gap-3">
        <span 
          className="font-serif text-lg font-bold tracking-tight leading-snug"
          style={{ color: palette.text }}
        >
          {data.label}
        </span>
        
        {data.count !== undefined && (
          <span 
            className="text-xs font-mono font-medium tabular-nums px-1.5 py-0.5 rounded-full"
            style={{ 
              color: palette.text,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' 
            }}
          >
            {data.count}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5 dark:border-white/5 text-[11px] font-sans">
        <span className="uppercase tracking-wider font-mono text-[10px] opacity-75 font-semibold" style={{ color: palette.text }}>
          Genre Cluster
        </span>
        <span className="text-[10px] opacity-60 group-hover:opacity-100 transition-opacity font-mono" style={{ color: palette.text }}>
          Focus →
        </span>
      </div>
    </div>
  );
};
