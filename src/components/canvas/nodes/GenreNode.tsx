import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Layers } from 'lucide-react';
import type { GraphNodeData } from '../../../types';

interface GenreNodeProps {
  data: GraphNodeData;
}

export const GenreNode: React.FC<GenreNodeProps> = ({ data }) => {
  return (
    <div className="relative group px-6 py-4 shadow-xl rounded-2xl bg-slate-900 border-2 border-neon-purple/50 min-w-[140px] text-center backdrop-blur-sm transition-all hover:border-neon-purple hover:shadow-[0_0_15px_rgba(157,78,221,0.5)]">
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-neon-purple border-2 border-slate-900" />
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-neon-purple border-2 border-slate-900" />
      
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="p-2 rounded-full bg-neon-purple/20 text-neon-purple group-hover:scale-110 transition-transform">
          <Layers size={20} />
        </div>
        <span className="font-bold text-slate-100 uppercase tracking-wider text-sm">{data.label}</span>
        {data.count !== undefined && (
          <span className="text-xs font-medium text-neon-purple bg-neon-purple/10 px-2 py-0.5 rounded-full border border-neon-purple/20">
            {data.count} {data.count === 1 ? 'Track' : 'Tracks'}
          </span>
        )}
      </div>
    </div>
  );
};
