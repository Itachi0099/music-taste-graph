import React, { useState, useEffect } from 'react';
import type { Node } from '@xyflow/react';
import { 
  Disc3, 
  Radio, 
  User, 
  Activity, 
  Edit3, 
  Save, 
  X,
  Trash2
} from 'lucide-react';
import { getGenreColor } from '../utils/colors';

interface DetailsPanelProps {
  selectedNode: Node | null;
  onUpdateNode?: (nodeId: string, updatedData: any) => void;
  onDeleteNode?: (nodeId: string) => void;
  onClose?: () => void;
}

export const DetailsPanel: React.FC<DetailsPanelProps> = ({ 
  selectedNode, 
  onUpdateNode,
  onDeleteNode,
  onClose 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState('');
  const [editGenre, setEditGenre] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editBpm, setEditBpm] = useState<number | string>('');
  const [editMood, setEditMood] = useState('');

  // Sync state when selected node changes
  useEffect(() => {
    if (selectedNode) {
      const data = selectedNode.data as any;
      setEditLabel(data.label || '');
      setEditGenre(data.genre || '');
      setEditArtist(data.artist || '');
      setEditBpm(data.bpm !== undefined && data.bpm !== null ? data.bpm : '');
      setEditMood(data.mood || 'Harmonic');
      setIsEditing(false);
    }
  }, [selectedNode]);

  if (!selectedNode) {
    return (
      <aside className="w-84 bg-slate-950/90 border-l border-white/5 p-6 hidden xl:flex flex-col items-center justify-center text-center backdrop-blur-xl">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 mb-3 shadow-inner">
          <Disc3 size={24} className="animate-spin-slow opacity-60" />
        </div>
        <h3 className="text-sm font-semibold font-display text-slate-200">Interactive Node Inspector</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-[200px] leading-relaxed">
          Click any genre, artist, or song node to highlight connected clusters and edit in real time.
        </p>
      </aside>
    );
  }

  const { type, data } = selectedNode;
  const colors = getGenreColor((data.genre as string) || (data.label as string));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateNode) return;

    onUpdateNode(selectedNode.id, {
      ...data,
      label: editLabel.trim() || (data.label as string),
      genre: editGenre.trim() || (data.genre as string),
      artist: editArtist.trim() || (data.artist as string),
      bpm: editBpm === '' ? null : Number(editBpm),
      mood: editMood,
    });
    setIsEditing(false);
  };

  return (
    <aside className="w-84 bg-slate-950/95 border-l border-white/5 p-5 hidden xl:flex flex-col h-full overflow-y-auto backdrop-blur-xl transition-all">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
          Node Inspector
        </span>
        <div className="flex items-center gap-1">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-cyan-400 transition-colors text-xs flex items-center gap-1"
              title="Edit in real time"
            >
              <Edit3 size={13} />
              <span>Edit</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-rose-400 transition-colors text-xs"
              title="Cancel"
            >
              <X size={13} />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Info Card */}
      <div className="mt-4 flex flex-col gap-4">
        {/* Node Banner / Header */}
        <div 
          className="p-4 rounded-xl border relative overflow-hidden backdrop-blur-md"
          style={{
            backgroundColor: `${colors.border}10`,
            borderColor: `${colors.border}35`,
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl border flex-shrink-0"
              style={{
                backgroundColor: `${colors.border}25`,
                borderColor: `${colors.border}50`,
                color: colors.text,
              }}
            >
              {type === 'genreNode' && <Radio size={22} />}
              {type === 'artistNode' && <User size={22} />}
              {type === 'trackNode' && <Disc3 size={22} />}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold" style={{ color: colors.text }}>
                {type === 'genreNode' ? 'Genre Hub' : type === 'artistNode' ? 'Artist Node' : 'Track Audio'}
              </span>
              <h2 className="text-base font-bold font-display text-slate-100 truncate" title={data.label as string}>
                {data.label as string}
              </h2>
              {type === 'trackNode' && Boolean(data.artist) && (
                <p className="text-xs text-slate-400 truncate">
                  by {String(data.artist)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Live Edit Mode Form */}
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-3.5 bg-white/5 p-4 rounded-xl border border-white/5">
            <div>
              <label className="text-[10.5px] text-slate-400 uppercase tracking-wider block mb-1 font-semibold">
                Title / Label
              </label>
              <input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                required
              />
            </div>

            {type !== 'genreNode' && (
              <div>
                <label className="text-[10.5px] text-slate-400 uppercase tracking-wider block mb-1 font-semibold">
                  Genre
                </label>
                <input
                  type="text"
                  value={editGenre}
                  onChange={(e) => setEditGenre(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>
            )}

            {type === 'trackNode' && (
              <>
                <div>
                  <label className="text-[10.5px] text-slate-400 uppercase tracking-wider block mb-1 font-semibold">
                    Artist
                  </label>
                  <input
                    type="text"
                    value={editArtist}
                    onChange={(e) => setEditArtist(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10.5px] text-slate-400 uppercase tracking-wider block mb-1 font-semibold">
                      BPM
                    </label>
                    <input
                      type="number"
                      value={editBpm}
                      onChange={(e) => setEditBpm(e.target.value)}
                      placeholder="e.g. 128"
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] text-slate-400 uppercase tracking-wider block mb-1 font-semibold">
                      Mood
                    </label>
                    <select
                      value={editMood}
                      onChange={(e) => setEditMood(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                    >
                      <option value="Euphoric">Euphoric</option>
                      <option value="Energized">Energized</option>
                      <option value="Groovy">Groovy</option>
                      <option value="Chill / Relaxed">Chill / Relaxed</option>
                      <option value="Hypnotic">Hypnotic</option>
                      <option value="Melancholic">Melancholic</option>
                      <option value="Dark / Intense">Dark / Intense</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Save size={13} />
              Save Real-Time Updates
            </button>
          </form>
        ) : (
          /* Read-Only Details */
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                  {type === 'genreNode' ? 'Genre Tracks' : type === 'artistNode' ? 'Artist Volume' : 'Assigned Genre'}
                </span>
                <span className="text-sm font-semibold text-slate-100 font-mono">
                  {type === 'trackNode' ? (data.genre as string) : `${data.count || 1} tracks`}
                </span>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                  Mood Aura
                </span>
                <span className="text-xs font-semibold text-pink-300">
                  {(data.mood as string) || 'Harmonic'}
                </span>
              </div>
            </div>

            {type === 'trackNode' && (data.bpm as number) && (
              <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-amber-400" />
                  <span className="text-xs text-slate-300">Audio Tempo:</span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-300">
                  {data.bpm as number} BPM
                </span>
              </div>
            )}

            {/* Quick Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <Edit3 size={12} className="text-cyan-400" />
                Edit Attributes
              </button>

              {onDeleteNode && (
                <button
                  onClick={() => onDeleteNode(selectedNode.id)}
                  title="Remove from graph"
                  className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
