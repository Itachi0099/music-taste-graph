import React from 'react';
import type { Node } from '@xyflow/react';
import { Disc, Layers, Users, Activity } from 'lucide-react';

interface DetailsPanelProps {
  selectedNode: Node | null;
}

export const DetailsPanel: React.FC<DetailsPanelProps> = ({ selectedNode }) => {
  if (!selectedNode) {
    return (
      <aside className="w-80 bg-slate-900 border-l border-slate-800 p-4 hidden lg:block overflow-y-auto">
        <h2 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Node Details</h2>
        <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500">
          <p className="text-sm">Click on any node in the graph to inspect its details.</p>
        </div>
      </aside>
    );
  }

  const { type, data } = selectedNode;

  return (
    <aside className="w-80 bg-slate-900 border-l border-slate-800 p-6 hidden lg:block overflow-y-auto">
      <h2 className="text-sm font-semibold text-slate-400 mb-6 uppercase tracking-wider">Node Details</h2>
      
      <div className="flex flex-col gap-6">
        {type === 'genreNode' && (
          <>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-neon-purple/20 text-neon-purple">
                <Layers size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-100">{data.label as string}</h3>
                <p className="text-sm text-neon-purple">Genre Hub</p>
              </div>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
              <p className="text-sm text-slate-400 mb-1">Total Tracks</p>
              <p className="text-lg font-semibold text-slate-200">{data.count as number}</p>
            </div>
          </>
        )}

        {type === 'artistNode' && (
          <>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-neon-cyan/20 text-neon-cyan">
                <Users size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-100">{data.label as string}</h3>
                <p className="text-sm text-neon-cyan">Artist</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <p className="text-xs text-slate-400 mb-1">Tracks</p>
                <p className="text-md font-semibold text-slate-200">{data.count as number}</p>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 overflow-hidden">
                <p className="text-xs text-slate-400 mb-1">Genre</p>
                <p className="text-md font-semibold text-slate-200 truncate" title={data.genre as string}>
                  {data.genre as string}
                </p>
              </div>
            </div>
          </>
        )}

        {type === 'trackNode' && (
          <>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-neon-emerald/20 text-neon-emerald">
                <Disc size={24} />
              </div>
              <div className="overflow-hidden">
                <h3 className="text-xl font-bold text-slate-100 truncate" title={data.label as string}>
                  {data.label as string}
                </h3>
                <p className="text-sm text-neon-emerald truncate" title={data.artist as string}>
                  {data.artist as string}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <p className="text-xs text-slate-400 mb-1">Genre</p>
                <p className="text-md font-semibold text-slate-200 truncate" title={data.genre as string}>
                  {data.genre as string}
                </p>
              </div>
              {(data.bpm as number) && (
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                    <Activity size={12} /> BPM
                  </p>
                  <p className="text-md font-semibold text-slate-200">{data.bpm as number}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
