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
  fetchSpotifyUserProfile,
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
import { SlidersHorizontal, Orbit, Network, AlertCircle, RefreshCw } from 'lucide-react';

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
  const recordsRef = useRef<RawTrackRecord[]>(records);
  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

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
          const currentDb = normalizeMusicRecords(recordsRef.current, 'spotify');
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
  }, []);

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

  // Disconnect Spotify session cleanly
  const handleDisconnectSpotify = useCallback(() => {
    clearTokens();
    lastSyncAtRef.current = 0;
    setSpotifyStatus({
      state: 'disconnected',
      lastSyncAt: null,
      label: 'Spotify · Offline',
      userId: undefined,
      userName: undefined,
      errorMessage: undefined,
    });
    setPlaybackState(null);
    setListeningEvents([]);
    // Restore default preset
    setPreset('electronic');
    setRecords(electronicData);
  }, []);

  // Automatic Spotify session restoration & continuous polling loop
  useEffect(() => {
    let isCancelled = false;
    let pollInterval: NodeJS.Timeout | null = null;

    getSpotifyToken()
      .then(async (token) => {
        if (!token || isCancelled) return;

        // 1. Immediately isolate user mode: clear demo presets so no data leakage occurs
        setPreset('spotify');
        setRecords([]);
        setListeningEvents([]);
        lastSyncAtRef.current = 0;

        setSpotifyStatus({
          state: 'connecting',
          lastSyncAt: null,
          label: 'Spotify · Connecting',
        });

        // 2. Identity Verification via /v1/me (never log tokens or credentials)
        let profile = null;
        try {
          profile = await fetchSpotifyUserProfile(token);
        } catch {
          // Continue to attempt track fetch even if profile endpoint is restricted
        }

        const userId = profile?.id;
        const userName = profile?.display_name || (userId ? `User: ${userId}` : undefined);

        if (!isCancelled) {
          setSpotifyStatus((prev) => ({
            ...prev,
            userId,
            userName,
            label: userName ? `Spotify · ${userName}` : 'Spotify · Connected',
          }));
        }

        // 3. Fetch user's personal top tracks
        let fetchedRecords: RawTrackRecord[] = [];
        let fetchFailed = false;
        let fetchErrorMessage = '';

        try {
          fetchedRecords = await fetchSpotifyTopTracks(token);
        } catch (err: unknown) {
          fetchFailed = true;
          fetchErrorMessage = err instanceof Error ? err.message : 'Could not retrieve top tracks';
          console.warn('Spotify initial top tracks fetch error:', fetchErrorMessage);
        }

        if (isCancelled) return;

        if (fetchFailed) {
          // Show error state instead of silently falling back to electronicData
          setRecords([]);
          setSpotifyStatus((prev) => ({
            ...prev,
            state: 'error',
            label: 'Spotify · Sync Failed',
            errorMessage: fetchErrorMessage,
          }));
          return;
        }

        if (fetchedRecords.length === 0) {
          // Show explicit empty library state instead of demo data
          setRecords([]);
          setSpotifyStatus((prev) => ({
            ...prev,
            state: 'empty_library',
            label: 'Spotify · Empty Library',
            errorMessage: 'No top tracks found for this Spotify account.',
          }));
        } else {
          const db = normalizeMusicRecords(fetchedRecords, 'spotify');
          setRecords(db.rawRecords);
          setSpotifyStatus((prev) => ({
            ...prev,
            state: 'updated_recently',
            lastSyncAt: Date.now(),
            label: userName ? `Spotify · ${userName}` : 'Spotify · Synced',
          }));
        }

        // 4. Reconcile current playback and recently played
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
        console.warn('Spotify session initialization error:', err instanceof Error ? err.message : String(err));
        setSpotifyStatus({
          state: 'error',
          lastSyncAt: null,
          label: 'Spotify · Error',
          errorMessage: 'Failed to establish Spotify session',
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

          {/* Explicit Spotify Error or Empty Library State (never silent demo fallback) */}
          {preset === 'spotify' && records.length === 0 && (
            <div className="absolute inset-0 z-40 bg-[var(--bg-primary)]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              {spotifyStatus.state === 'connecting' ? (
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="animate-spin text-emerald-400" size={28} />
                  <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
                    Synchronizing Spotify Universe...
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-mono max-w-sm">
                    {spotifyStatus.userName ? `Connected as ${spotifyStatus.userName}. ` : ''}
                    Fetching top tracks and resolving sonic gravities.
                  </p>
                </div>
              ) : spotifyStatus.state === 'error' ? (
                <div className="flex flex-col items-center gap-3 max-w-md">
                  <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <AlertCircle size={22} />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[var(--text-primary)]">
                    Spotify Synchronization Failed
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                    {spotifyStatus.errorMessage || 'Unable to retrieve your Spotify top tracks. Verify your Spotify account has listening activity or reconnect.'}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={handleManualSpotifyRefresh}
                      className="px-4 py-2 rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                      Retry Spotify Sync
                    </button>
                    <button
                      onClick={() => handlePresetChange('electronic')}
                      className="px-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      Explore Demo Universe
                    </button>
                  </div>
                </div>
              ) : spotifyStatus.state === 'empty_library' ? (
                <div className="flex flex-col items-center gap-3 max-w-md">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Orbit size={22} />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[var(--text-primary)]">
                    No Personal Spotify History Found
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                    Spotify returned no top tracks for this account yet. Play a few songs on Spotify or explore our curated presets.
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={handleManualSpotifyRefresh}
                      className="px-4 py-2 rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                      Check Again
                    </button>
                    <button
                      onClick={() => handlePresetChange('electronic')}
                      className="px-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      Load Demo Universe
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
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
