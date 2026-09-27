import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';
import type { GraphNodeData } from '../../../types';

interface ArtistNodeProps {
  data: GraphNodeData;
}

export const ArtistNode: React.FC<ArtistNodeProps> = ({ data }) => {
  return (
    <div className="relative px-5 py-3 shadow-lg rounded-full bg-slate-800 border border-neon-cyan/40 min-w-[120px] flex items-center gap-3 transition-all hover:border-neon-cyan hover:bg-slate-800/80 hover:shadow-[0_0_10px_rgba(0,245,212,0.3)]">
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-neon-cyan border-2 border-slate-900" />
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-neon-cyan border-2 border-slate-900" />
      
      <div className="w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center text-neon-cyan flex-shrink-0">
        <Users size={16} />
      </div>
      
      <div className="flex flex-col">
        <span className="font-semibold text-slate-100 text-sm whitespace-nowrap">{data.label}</span>
        {data.count !== undefined && (
          <span className="text-xs text-slate-400">
            {data.count} {data.count === 1 ? 'track' : 'tracks'}
          </span>
        )}
      </div>

      <div className="ml-2 pl-2 border-l border-slate-700 text-slate-500 hover:text-slate-300">
        {data.expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>
    </div>
  );
};
