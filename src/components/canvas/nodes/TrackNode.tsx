import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Disc } from 'lucide-react';
import type { GraphNodeData } from '../../../types';

interface TrackNodeProps {
  data: GraphNodeData;
}

export const TrackNode: React.FC<TrackNodeProps> = ({ data }) => {
  return (
    <div className="relative px-3 py-2 shadow-sm rounded-md bg-slate-900 border border-slate-700 min-w-[100px] max-w-[160px] flex items-center gap-2 transition-colors hover:border-neon-emerald/50">
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-neon-emerald border-2 border-slate-900" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-neon-emerald border-2 border-slate-900 opacity-0" />
      
      <Disc size={14} className="text-neon-emerald flex-shrink-0" />
      
      <div className="flex flex-col overflow-hidden">
        <span className="font-medium text-slate-200 text-xs truncate" title={data.label}>
          {data.label}
        </span>
        {data.bpm && (
          <span className="text-[10px] text-slate-500 font-mono">
            {data.bpm} BPM
          </span>
        )}
      </div>
    </div>
  );
};
