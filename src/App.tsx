import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { MainCanvas } from './components/canvas/MainCanvas';
import { DetailsPanel } from './components/DetailsPanel';
import { ReactFlowProvider } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import Papa from 'papaparse';

import electronicData from './data/electronic_club.json';
import indieData from './data/indie_alternative.json';
import eclecticData from './data/eclectic_mix.json';

import { buildGraphFromRecords } from './utils/graphBuilder';
import { getLayoutedElements } from './utils/layoutEngine';
import { computeAnalytics } from './utils/analytics';
import { getSpotifyToken, fetchSpotifyTopTracks } from './utils/spotify';
import type { RawTrackRecord, TasteSummary } from './types';
import * as htmlToImage from 'html-to-image';

function App() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [preset, setPreset] = useState<string>('electronic');
  const [layoutDir, setLayoutDir] = useState<'TB' | 'LR'>('TB');
  
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [summary, setSummary] = useState<TasteSummary | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const flowWrapperRef = useRef<HTMLDivElement>(null);

  const updateGraph = (rawData: RawTrackRecord[]) => {
    setSummary(computeAnalytics(rawData));
    const { nodes: initialNodes, edges: initialEdges } = buildGraphFromRecords(rawData);
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes, 
      initialEdges, 
      layoutDir
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setSelectedNode(null); // Reset selection on data change
  };

  // Spotify Authentication handling
  useEffect(() => {
    let isCancelled = false;

    getSpotifyToken()
      .then(token => {
        if (token && !isCancelled) {
          setPreset('spotify');
          
          fetchSpotifyTopTracks(token)
            .then(records => {
              if (!isCancelled) {
                updateGraph(records);
              }
            })
            .catch(err => {
              console.error(err);
              if (!isCancelled) {
                alert('Failed to load Spotify data');
              }
            });
        }
      })
      .catch(err => {
        console.error(err);
        if (!isCancelled) {
          alert(`Failed to authenticate with Spotify: ${err.message || err}`);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Load preset data
  useEffect(() => {
    if (preset === 'spotify') return; // Handled separately
    
    let rawData: RawTrackRecord[] = [];
    if (preset === 'electronic') rawData = electronicData;
    else if (preset === 'indie') rawData = indieData;
    else if (preset === 'eclectic') rawData = eclecticData;

    if (rawData.length > 0) {
      updateGraph(rawData);
    } else {
      setNodes([]);
      setEdges([]);
      setSummary(null);
    }
  }, [preset, layoutDir]);

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Map standard formats
          const mapped = results.data.map((row: any) => ({
            track: row.track || row.title || row.song || 'Unknown',
            artist: row.artist || 'Unknown Artist',
            genre: row.genre || 'Unknown Genre',
            bpm: typeof row.bpm === 'number' ? row.bpm : typeof row.tempo === 'number' ? row.tempo : null,
          }));
          setPreset(''); // custom
          updateGraph(mapped);
        }
      });
    } else if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          setPreset('');
          updateGraph(parsed);
        } catch (err) {
          console.error(err);
          alert('Invalid JSON file format.');
        }
      };
      reader.readAsText(file);
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExport = () => {
    if (flowWrapperRef.current === null) return;
    htmlToImage.toPng(flowWrapperRef.current, { backgroundColor: '#09090b' })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'taste-graph.png';
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('Oops, something went wrong!', err);
      });
  };

  return (
    <div className="app-container">
      <Header 
        preset={preset} 
        onPresetChange={setPreset} 
        onImportClick={handleImport}
        onExportClick={handleExport}
      />
      <input 
        type="file" 
        accept=".csv,.json" 
        ref={fileInputRef} 
        onChange={onFileChange} 
        className="hidden" 
      />
      
      <StatsBar summary={summary} />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Filter Sidebar */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 hidden md:block overflow-y-auto">
          <h2 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Filters & Layout</h2>
          <div className="space-y-6">
            <div>
              <label className="text-xs text-slate-500 mb-2 block">Layout Type</label>
              <select 
                value={layoutDir}
                onChange={(e) => setLayoutDir(e.target.value as 'TB' | 'LR')}
                className="w-full bg-slate-800 border border-slate-700 text-sm rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-neon-cyan text-slate-300"
              >
                <option value="TB">Hierarchical (Top-Down)</option>
                <option value="LR">Hierarchical (Left-Right)</option>
              </select>
            </div>
            
            {summary && (
              <div>
                <label className="text-xs text-slate-500 mb-2 block">Top Genres</label>
                <div className="flex flex-wrap gap-2">
                  {summary.topGenres.map(g => (
                    <span key={g.genre} className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded-full border border-slate-700">
                      {g.genre} ({g.percentage}%)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Canvas */}
        <div className="flex-1 relative" ref={flowWrapperRef}>
          <ReactFlowProvider>
            <MainCanvas 
              initialNodes={nodes} 
              initialEdges={edges} 
              onNodeSelect={setSelectedNode} 
            />
          </ReactFlowProvider>
        </div>

        {/* Details Panel */}
        <DetailsPanel selectedNode={selectedNode} />
      </main>
    </div>
  );
}

export default App;
