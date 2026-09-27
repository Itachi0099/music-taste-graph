import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { GraphNodeData } from '../../../types';

interface TrackNodeProps {
  data: GraphNodeData;
}

export const TrackNode: React.FC<TrackNodeProps> = ({ data }) => {
  const isSelected = Boolean(data.selected);
  const isDimmed = Boolean(data.dimmed);

  return (
    <div 
      className={`group relative px-3 py-2 rounded-md border text-left cursor-pointer select-none min-w-[130px] max-w-[190px] transition-all duration-200 ${
        isSelected
          ? 'bg-[var(--bg-card)] border-[var(--text-primary)] ring-1 ring-[var(--text-primary)] shadow-md scale-105'
          : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:bg-[var(--bg-card)] hover:border-[var(--border-primary)] shadow-xs hover:shadow-sm'
      }`}
      style={{
        opacity: isDimmed ? 0.2 : 0.9,
        transition: 'transform 0.2s ease, opacity 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0 !w-1 !h-1" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-1 !h-1" />
      <Handle type="target" id="left" position={Position.Left} className="!opacity-0 !w-1 !h-1" />
      <Handle type="source" id="right" position={Position.Right} className="!opacity-0 !w-1 !h-1" />

      <span 
        className="font-sans text-xs text-[var(--text-primary)] font-medium truncate block leading-tight" 
        title={data.label}
      >
        {data.label}
      </span>
      
      <div className="flex items-center justify-between mt-1 text-[9.5px] text-[var(--text-muted)] font-mono">
        <span className="truncate max-w-[75px]">{data.artist}</span>
        {data.bpm ? <span>{data.bpm} bpm</span> : null}
      </div>
    </div>
  );
};
