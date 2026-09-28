import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TopNavigation } from './components/TopNavigation';
import { DetailsDrawer } from './components/DetailsDrawer';
import { RecommendationsDrawer } from './components/RecommendationsDrawer';
import { FilterPopover } from './components/FilterPopover';
import { InsightsModal } from './components/InsightsModal';
import { MainCanvas } from './components/canvas/MainCanvas';
import { CelestialUniverseCanvas, type UniverseSelection } from './components/canvas/CelestialUniverseCanvas';
import { DiscoveryPanel } from './components/DiscoveryPanel';
import { ReactFlowProvider } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import Papa from 'papaparse';

import electronicData from './data/electronic_club.json';
import indieData from './data/indie_alternative.json';
import eclecticData from './data/eclectic_mix.json';

import { buildGraphFromRecords } from './utils/graphBuilder';
import { getLayoutedElements } from './utils/layoutEngine';
import { buildCelestialUniverse } from './utils/universeBuilder';
import { computeAnalytics } from './utils/analytics';
import { generateDiscoveryRecommendations } from './utils/discoveryEngine';
import { 
  getSpotifyToken, 
  fetchSpotifyTopTracks, 
  fetchCurrentlyPlaying, 
  fetchRecentlyPlayedEvents,
  clearTokens,
} from './utils/spotify';
import { normalizeMusicRecords, ingestListeningEvents } from './utils/normalizer';
import type { 
  RawTrackRecord, 
  TasteSummary, 
  RecommendationItem, 
  DiscoveryCategory, 
  ListeningEvent, 
  SpotifyPlaybackState,
  SpotifyStatusInfo,
} from './types';
import { SlidersHorizontal, Orbit, Network } from 'lucide-react';

function App() {
  const [records, setRecords] = useState<RawTrackRecord[]>(electronicData);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [preset, setPreset] = useState<string>('electronic');
  
  // Normalized Listening Events & Playback State
  const [listeningEvents, setListeningEvents] = useState<ListeningEvent[]>([]);
  const [playbackState, setPlaybackState] = useState<SpotifyPlaybackState | null>(null);
  const [spotifyStatus, setSpotifyStatus] = useState<SpotifyStatusInfo>({
    state: 'disconnected',
    lastSyncAt: null,
    label: 'Spotify · Offline',
  });
  const [isRefreshingSpotify, setIsRefreshingSpotify] = useState<boolean>(false);
  const lastSyncAtRef = useRef<number>(0);

  // Navigation & Progressive disclosure states
  const [viewFilter, setViewFilter] = useState<'all' | 'genres' | 'artists' | 'tracks'>('all');
  const [expandedGenreIds, setExpandedGenreIds] = useState<Set<string>>(new Set());
  const [expandedArtistIds, setExpandedArtistIds] = useState<Set<string>>(new Set());
  
  // Modals & Drawers
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState<boolean>(false);
  const [isRecommendationsOpen, setIsRecommendationsOpen] = useState<boolean>(false);
  const [isDiscoverPanelOpen, setIsDiscoverPanelOpen] = useState<boolean>(false);
  const [discoveryCategoryFilter, setDiscoveryCategoryFilter] = useState<DiscoveryCategory | 'all'>('all');
  
  // Active Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>('all');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>('all');
  const [minBpm, setMinBpm] = useState<number>(60);
  const [maxBpm, setMaxBpm] = useState<number>(200);
  const [summary, setSummary] = useState<TasteSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Visual Mode: 'universe' (Personal Celestial Universe) vs 'graph' (Classic Graph)
  const [visualMode, setVisualMode] = useState<'universe' | 'graph'>('universe');
  const [universeSelection, setUniverseSelection] = useState<UniverseSelection>(null);

  // Theme mode: light (warm off-white) vs dark (warm charcoal/midnight)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('symphony_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('symphony_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('symphony_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedGenreFilter !== 'all' && r.genre.toLowerCase() !== selectedGenreFilter.toLowerCase()) {
        return false;
      }
      if (selectedMoodFilter !== 'all' && (r.mood || '').toLowerCase() !== selectedMoodFilter.toLowerCase()) {
        return false;
      }
      if (r.bpm && (r.bpm < minBpm || r.bpm > maxBpm)) {
        return false;
      }
      return true;
    });
  }, [records, selectedGenreFilter, selectedMoodFilter, minBpm, maxBpm]);

  // Update layout when records, view filters, or progressive disclosures change
  useEffect(() => {
    const computed = computeAnalytics(filteredRecords);
    setSummary(computed);

    const { nodes: initialNodes, edges: initialEdges } = buildGraphFromRecords(filteredRecords, {
      expandedGenreIds,
      expandedArtistIds,
      activeViewFilter: viewFilter,
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [filteredRecords, viewFilter, expandedGenreIds, expandedArtistIds]);

  // Compute Celestial Universe model with live listening events and playback
  const celestialUniverse = useMemo(() => {
    return buildCelestialUniverse(filteredRecords, isDark, listeningEvents, playbackState);
  }, [filteredRecords, isDark, listeningEvents, playbackState]);

  // Handle progressive disclosure clicks
  const handleToggleExpand = (node: Node) => {
    if (node.type === 'genreNode') {
      setExpandedGenreIds((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    } else if (node.type === 'artistNode') {
      setExpandedArtistIds((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    }
  };

  // Recommendations
  const recommendations = useMemo<RecommendationItem[]>(() => {
    const rawDisc = generateDiscoveryRecommendations(records, 'all', summary?.tasteProfile);
    return rawDisc.map((d) => ({
      id: d.id,
      type: 'artist',
      title: d.artist,
      subtitle: d.genre + (d.subgenre ? ` · ${d.subgenre}` : ''),
      genre: d.genre,
      bpm: d.bpm,
      mood: 'Harmonic',
      matchScore: Math.round(d.score * 100),
      reason: d.reasons[0] || 'Matches your taste profile',
    }));
  }, [records, summary]);

  const availableMoods = useMemo(() => {
    if (!summary?.moodBreakdown) return [];
    return summary.moodBreakdown.map((m) => m.mood);
  }, [summary]);

  // Preset switching
  const handlePresetChange = (newPreset: string) => {
    setPreset(newPreset);
    setSelectedNode(null);
    setExpandedGenreIds(new Set());
    setExpandedArtistIds(new Set());

    if (newPreset === 'electronic') setRecords(electronicData);
    else if (newPreset === 'indie') setRecords(indieData);
    else if (newPreset === 'eclectic') setRecords(eclecticData);
  };

  const isReconcilingRef = useRef(false);

  // Reconcile Spotify events incrementally with overlap protection (R-03)
  const reconcileSpotifyData = useCallback(async (token: string) => {
    if (isReconcilingRef.current) return;
    isReconcilingRef.current = true;
    try {
      // 1. Fetch currently playing
      const current = await fetchCurrentlyPlaying(token);
      if (current) {
        setPlaybackState(current);
      }

      // 2. Fetch recently played events incrementally
      const afterTs = lastSyncAtRef.current > 0 ? lastSyncAtRef.current : undefined;
      const recentEvents = await fetchRecentlyPlayedEvents(token, afterTs);

      if (recentEvents.length > 0) {
        const now = Date.now();
        lastSyncAtRef.current = now;

        setListeningEvents((prev) => {
          const currentDb = normalizeMusicRecords(records, 'spotify');
          const { db, addedEvents } = ingestListeningEvents({ ...currentDb, listeningEvents: prev }, recentEvents);
          if (addedEvents.length > 0) {
            setRecords(db.rawRecords);
          }
          return db.listeningEvents;
        });
      }

      setSpotifyStatus({
        state: current?.isPlaying ? 'live' : 'updated_recently',
        lastSyncAt: Date.now(),
        label: current?.isPlaying ? 'Spotify · Live' : 'Spotify · Synced',
      });
    } catch (err) {
      console.warn('Spotify reconcile error (keeping local universe intact):', err);
    } finally {
      isReconcilingRef.current = false;
    }
  }, [records]);

  // Manual refresh Spotify trigger
  const handleManualSpotifyRefresh = async () => {
    setIsRefreshingSpotify(true);
    try {
      const token = await getSpotifyToken();
      if (token) {
        await reconcileSpotifyData(token);
      }
    } finally {
      setIsRefreshingSpotify(false);
    }
  };

  // Disconnect Spotify session
  const handleDisconnectSpotify = useCallback(() => {
    clearTokens();
    setSpotifyStatus({
      state: 'disconnected',
      lastSyncAt: null,
      label: 'Spotify · Offline',
    });
    setPlaybackState(null);
    setPreset('electronic');
  }, []);

  // Automatic Spotify session restoration & continuous polling loop
  useEffect(() => {
    let isCancelled = false;
    let pollInterval: NodeJS.Timeout | null = null;

    getSpotifyToken()
      .then(async (token) => {
        if (!token || isCancelled) return;

        setSpotifyStatus({
          state: 'connecting',
          lastSyncAt: null,
          label: 'Spotify · Connecting',
        });

        setPreset('spotify');

        // Initial fetch of library
        try {
          const fetchedRecords = await fetchSpotifyTopTracks(token);
          if (!isCancelled && fetchedRecords && fetchedRecords.length > 0) {
            const db = normalizeMusicRecords(fetchedRecords, 'spotify');
            setRecords(db.rawRecords);
          }
        } catch (err) {
          console.warn('Spotify initial top tracks fetch error, keeping current preset:', err);
        }

        // Reconcile current playback and recently played
        if (!isCancelled) {
          await reconcileSpotifyData(token);
        }

        // Setup background polling (every 20s while tab is visible)
        const setupPolling = () => {
          if (pollInterval) clearInterval(pollInterval);
          if (document.hidden) return; // Pause when hidden

          pollInterval = setInterval(async () => {
            if (!document.hidden && !isCancelled) {
              const activeToken = await getSpotifyToken();
              if (activeToken) {
                await reconcileSpotifyData(activeToken);
              } else {
                setSpotifyStatus({
                  state: 'disconnected',
                  lastSyncAt: null,
                  label: 'Spotify · Offline',
                });
                if (pollInterval) clearInterval(pollInterval);
              }
            }
          }, 20000);
        };

        setupPolling();

        // Page Visibility API handler
        const handleVisibilityChange = async () => {
          if (document.hidden) {
            if (pollInterval) clearInterval(pollInterval);
          } else {
            // User returned to tab: immediately reconcile
            const activeToken = await getSpotifyToken();
            if (activeToken) {
              await reconcileSpotifyData(activeToken);
            }
            setupPolling();
          }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      })
      .catch((err) => {
        console.warn('Spotify session error, continuing with cached universe:', err);
        setSpotifyStatus({
          state: 'disconnected',
          lastSyncAt: null,
          label: 'Spotify · Offline',
        });
      });

    return () => {
      isCancelled = true;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [reconcileSpotifyData]);

  // Add discovery item into graph
  const handleAddRecommendation = (item: RecommendationItem) => {
    const newRecord: RawTrackRecord = {
      track: item.title,
      artist: item.subtitle.split(' · ')[0] || item.subtitle,
      genre: item.genre,
      bpm: item.bpm,
      mood: item.mood,
    };
    setPreset('');
    setRecords([newRecord, ...records]);
  };

  // Import files into common normalization pipeline
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
          const rawMapped: RawTrackRecord[] = results.data.map((row: any) => ({
            track: row.track || row.title || row.song || 'Unknown',
            artist: row.artist || 'Unknown Artist',
            genre: row.genre || 'Unknown Genre',
            bpm: typeof row.bpm === 'number' ? row.bpm : typeof row.tempo === 'number' ? row.tempo : null,
          }));
          const db = normalizeMusicRecords(rawMapped, 'csv');
          setPreset('');
          setRecords(db.rawRecords);
        },
      });
    } else if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            const db = normalizeMusicRecords(parsed, 'csv');
            setPreset('');
            setRecords(db.rawRecords);
          }
        } catch (err) {
          console.error(err);
          alert('Invalid JSON file format.');
        }
      };
      reader.readAsText(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResetFilters = () => {
    setSelectedGenreFilter('all');
    setSelectedMoodFilter('all');
    setMinBpm(60);
    setMaxBpm(200);
    setSearchQuery('');
  };

  return (
    <div className={`app-container ${isDark ? 'dark' : ''} bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200`}>
      {/* Minimal Top Navigation */}
      <TopNavigation
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onImportClick={handleImport}
        onOpenInsights={() => setIsInsightsOpen(true)}
        onOpenRecommendations={() => setIsDiscoverPanelOpen(true)}
        preset={preset}
        onPresetChange={handlePresetChange}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        spotifyStatus={spotifyStatus}
        playbackState={playbackState}
        onManualSpotifyRefresh={handleManualSpotifyRefresh}
        isRefreshingSpotify={isRefreshingSpotify}
        onDisconnectSpotify={handleDisconnectSpotify}
      />

      <input
        type="file"
        accept=".csv,.json"
        ref={fileInputRef}
        onChange={onFileChange}
        className="hidden"
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden px-4 md:px-8 pt-4 pb-2">
        {/* Editorial Subheader: "Your music" & understated statistics */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between pb-3 border-b border-[var(--border-primary)] gap-3 select-none flex-shrink-0">
          <div className="flex items-baseline gap-4 flex-wrap">
            <h1 className="font-serif text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Your music
            </h1>
            {summary && (
              <span className="text-xs text-[var(--text-tertiary)] font-mono">
                {summary.totalTracks.toLocaleString()} tracks · {summary.totalArtists.toLocaleString()} artists · {summary.totalGenres.toLocaleString()} stellar systems
              </span>
            )}
          </div>

          {/* Minimal Segmented Filter & Filter Button */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-3 text-[var(--text-tertiary)]">
              {(['all', 'genres', 'artists', 'tracks'] as const).map((filterOption) => (
                <button
                  key={filterOption}
                  onClick={() => setViewFilter(filterOption)}
                  className={`capitalize transition-colors ${
                    viewFilter === filterOption
                      ? 'text-[var(--text-primary)] font-semibold underline underline-offset-4 decoration-1'
                      : 'hover:text-[var(--text-primary)]'
                  }`}
                >
                  {filterOption}
                </button>
              ))}
            </div>

            <div className="h-3 w-px bg-[var(--border-primary)]" />

            {/* Metaphor Mode Toggle: Universe (Celestial) vs Graph (Classic Nodes) */}
            <div className="flex items-center rounded-md p-0.5 bg-[var(--bg-surface)] border border-[var(--border-primary)]">
              <button
                onClick={() => setVisualMode('universe')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all ${
                  visualMode === 'universe'
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="Personal Music Universe"
              >
                <Orbit size={13} />
                <span>Universe</span>
              </button>
              <button
                onClick={() => setVisualMode('graph')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all ${
                  visualMode === 'graph'
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="Node Network Graph"
              >
                <Network size={13} />
                <span>Graph</span>
              </button>
            </div>

            <div className="h-3 w-px bg-[var(--border-primary)]" />

            <button
              onClick={() => setIsFilterOpen(true)}
              className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium"
            >
              <SlidersHorizontal size={13} />
              <span>Filter</span>
              {(selectedGenreFilter !== 'all' || selectedMoodFilter !== 'all' || minBpm > 60 || maxBpm < 200) && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-primary)]" />
              )}
            </button>
          </div>
        </div>

        {/* Hero Interactive Visualization Canvas (Universe is Hero) */}
        <div className="flex-1 w-full h-full relative overflow-hidden rounded-xl border border-[var(--border-subtle)]">
          {visualMode === 'universe' ? (
            <CelestialUniverseCanvas
              universeData={celestialUniverse}
              selection={universeSelection}
              onSelect={(sel) => {
                setUniverseSelection(sel);
                if (sel?.type === 'genre') {
                  const matchNode = nodes.find((n) => n.type === 'genreNode' && (n.data.label as string).toLowerCase() === sel.item.name.toLowerCase());
                  if (matchNode) setSelectedNode(matchNode);
                } else if (sel?.type === 'artist') {
                  const matchNode = nodes.find((n) => n.type === 'artistNode' && (n.data.label as string).toLowerCase() === sel.item.name.toLowerCase());
                  if (matchNode) setSelectedNode(matchNode);
                } else if (sel?.type === 'track') {
                  const matchNode = nodes.find((n) => n.type === 'trackNode' && (n.data.label as string).toLowerCase() === sel.item.title.toLowerCase());
                  if (matchNode) setSelectedNode(matchNode);
                } else {
                  setSelectedNode(null);
                }
              }}
              onAddDiscoveryTrack={(t) => {
                const newRecord: RawTrackRecord = {
                  track: t.track,
                  artist: t.artist,
                  genre: t.genre,
                  bpm: t.bpm || null,
                };
                setPreset('');
                setRecords((prev) => [newRecord, ...prev]);
              }}
              searchQuery={searchQuery}
              viewFilter={viewFilter}
              discoveryFilter={discoveryCategoryFilter}
              onDiscoveryFilterChange={setDiscoveryCategoryFilter}
              isDark={isDark}
            />
          ) : (
            <ReactFlowProvider>
              <MainCanvas
                initialNodes={nodes}
                initialEdges={edges}
                selectedNode={selectedNode}
                onNodeSelect={(node) => {
                  setSelectedNode(node);
                  if (node?.type === 'genreNode') {
                    const g = celestialUniverse.genres.find((x) => x.name.toLowerCase() === (node.data.label as string).toLowerCase());
                    if (g) setUniverseSelection({ type: 'genre', item: g });
                  } else if (node?.type === 'artistNode') {
                    const a = celestialUniverse.artists.find((x) => x.name.toLowerCase() === (node.data.label as string).toLowerCase());
                    if (a) setUniverseSelection({ type: 'artist', item: a });
                  } else if (node?.type === 'trackNode') {
                    const t = celestialUniverse.allTracks.find((x) => x.title.toLowerCase() === (node.data.label as string).toLowerCase());
                    if (t) setUniverseSelection({ type: 'track', item: t });
                  } else {
                    setUniverseSelection(null);
                  }
                }}
                onToggleExpand={handleToggleExpand}
                searchQuery={searchQuery}
                isDark={isDark}
              />
            </ReactFlowProvider>
          )}
        </div>

        {/* Discovery Panel */}
        <DiscoveryPanel
          isOpen={isDiscoverPanelOpen}
          onClose={() => setIsDiscoverPanelOpen(false)}
          discoveries={celestialUniverse.discoveries || []}
          activeCategory={discoveryCategoryFilter}
          onCategoryChange={setDiscoveryCategoryFilter}
          onSelectDiscovery={(disc) => {
            setVisualMode('universe');
            setUniverseSelection({ type: 'discovery', item: disc });
          }}
        />

        {/* Contextual Right Drawer for Selected Node */}
        <DetailsDrawer
          selectedNode={selectedNode}
          records={records}
          onClose={() => setSelectedNode(null)}
          onSelectArtist={(artistName) => {
            const matchNode = nodes.find(
              (n) => n.type === 'artistNode' && (n.data.label as string).toLowerCase() === artistName.toLowerCase()
            );
            if (matchNode) setSelectedNode(matchNode);
          }}
          onSelectGenre={(genreName) => {
            const matchNode = nodes.find(
              (n) => n.type === 'genreNode' && (n.data.label as string).toLowerCase() === genreName.toLowerCase()
            );
            if (matchNode) setSelectedNode(matchNode);
          }}
        />

        {/* Contextual Recommendations Drawer */}
        <RecommendationsDrawer
          isOpen={isRecommendationsOpen}
          onClose={() => setIsRecommendationsOpen(false)}
          recommendations={recommendations}
          selectedMood={selectedMoodFilter}
          onSelectMood={setSelectedMoodFilter}
          availableMoods={availableMoods}
          onAddRecommendation={handleAddRecommendation}
          isDark={isDark}
        />

        {/* Filter Popover */}
        <FilterPopover
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          summary={summary}
          selectedGenre={selectedGenreFilter}
          onSelectGenre={setSelectedGenreFilter}
          selectedMood={selectedMoodFilter}
          onSelectMood={setSelectedMoodFilter}
          minBpm={minBpm}
          maxBpm={maxBpm}
          onBpmChange={(min, max) => {
            setMinBpm(min);
            setMaxBpm(max);
          }}
          onReset={handleResetFilters}
        />

        {/* Secondary Insights Modal */}
        <InsightsModal
          isOpen={isInsightsOpen}
          onClose={() => setIsInsightsOpen(false)}
          summary={summary}
          isDark={isDark}
        />
      </main>
    </div>
  );
}

export default App;
