import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { TopNavigation } from './components/TopNavigation';
import { DetailsDrawer } from './components/DetailsDrawer';
import { FilterPopover } from './components/FilterPopover';
import { CelestialUniverseCanvas, type UniverseSelection } from './components/canvas/CelestialUniverseCanvas';
import type { Node, Edge } from '@xyflow/react';

// Lazy-loaded secondary components and graph canvas
const MainCanvas = lazy(() => import('./components/canvas/MainCanvas'));
const InsightsModal = lazy(() => import('./components/InsightsModal').then((m) => ({ default: m.InsightsModal })));
const RecommendationsDrawer = lazy(() => import('./components/RecommendationsDrawer').then((m) => ({ default: m.RecommendationsDrawer })));
const DiscoveryPanel = lazy(() => import('./components/DiscoveryPanel').then((m) => ({ default: m.DiscoveryPanel })));

import electronicData from './data/electronic_club.json';

import { buildGraphFromRecords } from './utils/graphBuilder';
import { getLayoutedElements } from './utils/layoutEngine';
import { buildCelestialUniverse } from './utils/universeBuilder';
import { computeAnalytics } from './utils/analytics';
import { generateDiscoveryRecommendations } from './utils/discoveryEngine';
import { 
  getSpotifyToken, 
  loginWithSpotify,
  fetchSpotifyUserProfile,
  fetchSpotifyTopTracks, 
  fetchCurrentlyPlaying, 
  fetchRecentlyPlayedEvents,
  clearTokens,
  SpotifyApiError,
  logSpotifySyncDiagnostic,
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
  SpotifyConnectionState,
} from './types';
import { SlidersHorizontal, Orbit, Network, AlertCircle, RefreshCw } from 'lucide-react';

function App() {
  const [records, setRecords] = useState<RawTrackRecord[]>(electronicData);
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
  const listeningEventsRef = useRef<ListeningEvent[]>(listeningEvents);
  useEffect(() => {
    listeningEventsRef.current = listeningEvents;
  }, [listeningEvents]);

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

  // Compute analytics summary directly with useMemo (prevents cascading re-renders)
  const summary = useMemo<TasteSummary | null>(() => {
    return computeAnalytics(filteredRecords);
  }, [filteredRecords]);

  // Derive classic graph layout only when in graph mode and dependencies change
  const { nodes, edges } = useMemo(() => {
    if (visualMode !== 'graph') {
      return { nodes: [] as Node[], edges: [] as Edge[] };
    }
    const { nodes: initialNodes, edges: initialEdges } = buildGraphFromRecords(filteredRecords, {
      expandedGenreIds,
      expandedArtistIds,
      activeViewFilter: viewFilter,
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges
    );

    return { nodes: layoutedNodes, edges: layoutedEdges };
  }, [filteredRecords, viewFilter, expandedGenreIds, expandedArtistIds, visualMode]);

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
  const handlePresetChange = async (newPreset: string) => {
    setPreset(newPreset);
    setSelectedNode(null);
    setExpandedGenreIds(new Set());
    setExpandedArtistIds(new Set());

    if (newPreset === 'electronic') {
      setRecords(electronicData);
    } else if (newPreset === 'indie') {
      const data = await import('./data/indie_alternative.json');
      setRecords(data.default);
    } else if (newPreset === 'eclectic') {
      const data = await import('./data/eclectic_mix.json');
      setRecords(data.default);
    }
  };

  const isReconcilingRef = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSpotifyActiveRef = useRef<boolean>(false);

  // Stop polling interval cleanly
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

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

        const currentDb = normalizeMusicRecords(recordsRef.current, 'spotify');
        const { db, addedEvents } = ingestListeningEvents(
          { ...currentDb, listeningEvents: listeningEventsRef.current },
          recentEvents
        );

        if (addedEvents.length > 0) {
          setRecords(db.rawRecords);
          setListeningEvents(db.listeningEvents);
        }
      }

      // 3. Update status safely without overwriting error/access_denied states
      setSpotifyStatus((prev) => {
        if (prev.state === 'access_denied' || prev.state === 'unauthorized') {
          return prev;
        }

        const isPlaying = current?.isPlaying;
        let newState: SpotifyConnectionState = prev.state;
        if (isPlaying) {
          newState = 'live';
        } else if (prev.state === 'empty_library' && recordsRef.current.length === 0) {
          newState = 'empty_library';
        } else {
          newState = 'updated_recently';
        }

        return {
          ...prev,
          state: newState,
          lastSyncAt: Date.now(),
          label: isPlaying
            ? 'Spotify · Live'
            : newState === 'empty_library'
              ? 'Spotify · Connected'
              : 'Spotify · Synced',
        };
      });
    } catch (err: unknown) {
      if (err instanceof SpotifyApiError) {
        if (err.status === 403) {
          isSpotifyActiveRef.current = false;
          stopPolling();
          setRecords([]);
          setListeningEvents([]);
          setPlaybackState(null);
          setSpotifyStatus((prev) => ({
            ...prev,
            state: 'access_denied',
            lastSyncAt: null,
            label: 'Spotify · Access unavailable',
            errorMessage: "Your Spotify account was authenticated, but Spotify isn't currently allowing this account to access this Development Mode app. Ask the app owner to grant access, or try again later.",
          }));
          return;
        }
        if (err.status === 401) {
          isSpotifyActiveRef.current = false;
          stopPolling();
          setPlaybackState(null);
          setSpotifyStatus((prev) => ({
            ...prev,
            state: 'unauthorized',
            lastSyncAt: null,
            label: 'Spotify · Reconnect required',
            errorMessage: 'Spotify session expired. Please reconnect.',
          }));
          return;
        }
        if (err.status === 429) {
          setSpotifyStatus((prev) => ({
            ...prev,
            state: 'rate_limited',
            label: 'Spotify · Rate limited',
          }));
          return;
        }
        if (err.classification === 'network_error' || err.classification === 'offline') {
          setSpotifyStatus((prev) => ({
            ...prev,
            state: 'offline',
            label: 'Spotify · Offline',
          }));
          return;
        }
      }
      console.warn('Spotify reconcile error (keeping local universe intact):', err);
    } finally {
      isReconcilingRef.current = false;
    }
  }, [stopPolling]);

  // Setup background polling (every 20s while tab is visible and active)
  const startPolling = useCallback(() => {
    // Clear any existing interval to guarantee at most ONE active interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (document.hidden || !isSpotifyActiveRef.current) return;

    pollIntervalRef.current = setInterval(async () => {
      if (document.hidden || !isSpotifyActiveRef.current) return;
      const activeToken = await getSpotifyToken();
      if (activeToken) {
        await reconcileSpotifyData(activeToken);
      } else {
        isSpotifyActiveRef.current = false;
        setSpotifyStatus((prev) => ({
          ...prev,
          state: 'disconnected',
          lastSyncAt: null,
          label: 'Spotify · Offline',
        }));
        stopPolling();
      }
    }, 20000);
  }, [reconcileSpotifyData, stopPolling]);

  // Primary Spotify Synchronization pipeline
  const syncSpotifyUser = useCallback(async (token: string) => {
    isSpotifyActiveRef.current = true;

    // Immediately isolate user mode: clear demo presets so no data leakage occurs
    setPreset('spotify');
    setRecords([]);
    setListeningEvents([]);
    setPlaybackState(null);
    lastSyncAtRef.current = 0;

    setSpotifyStatus((prev) => ({
      ...prev,
      state: 'syncing',
      lastSyncAt: null,
      label: 'Spotify · Syncing',
      errorMessage: undefined,
    }));

    try {
      // 1. Identity Verification via /v1/me (never log tokens or credentials)
      let profile = null;
      try {
        profile = await fetchSpotifyUserProfile(token);
      } catch (err: unknown) {
        if (err instanceof SpotifyApiError && (err.status === 403 || err.status === 401)) {
          throw err;
        }
        console.warn('Profile fetch non-fatal error:', err);
      }

      const userId = profile?.id;
      const userName = profile?.display_name || (userId ? `User: ${userId}` : undefined);

      if (userId || userName) {
        setSpotifyStatus((prev) => ({
          ...prev,
          userId: userId || prev.userId,
          userName: userName || prev.userName,
        }));
      }

      // 2. Fetch user's personal top tracks
      const fetchedRecords = await fetchSpotifyTopTracks(token);

      if (fetchedRecords.length === 0) {
        setRecords([]);
        setSpotifyStatus((prev) => ({
          ...prev,
          state: 'empty_library',
          lastSyncAt: Date.now(),
          label: 'Spotify · Connected',
          errorMessage: '0 tracks found for this Spotify account.',
        }));
      } else {
        const db = normalizeMusicRecords(fetchedRecords, 'spotify');
        setRecords(db.rawRecords);
        setSpotifyStatus((prev) => ({
          ...prev,
          state: 'updated_recently',
          lastSyncAt: Date.now(),
          label: 'Spotify · Synced',
          errorMessage: undefined,
        }));
        logSpotifySyncDiagnostic('success', '/v1/me/top/tracks');
      }

      // 3. Reconcile playback and recent events
      await reconcileSpotifyData(token);

      // 4. Start polling if sync succeeded
      if (isSpotifyActiveRef.current) {
        startPolling();
      }
    } catch (err: unknown) {
      isSpotifyActiveRef.current = false;
      stopPolling();
      setRecords([]);
      setListeningEvents([]);
      setPlaybackState(null);

      if (err instanceof SpotifyApiError) {
        if (err.status === 403) {
          setSpotifyStatus((prev) => ({
            ...prev,
            state: 'access_denied',
            lastSyncAt: null,
            label: 'Spotify · Access unavailable',
            errorMessage: "Your Spotify account was authenticated, but Spotify isn't currently allowing this account to access this Development Mode app. Ask the app owner to grant access, or try again later.",
          }));
          return;
        }
        if (err.status === 401) {
          setSpotifyStatus((prev) => ({
            ...prev,
            state: 'unauthorized',
            lastSyncAt: null,
            label: 'Spotify · Reconnect required',
            errorMessage: 'Spotify session expired. Please reconnect.',
          }));
          return;
        }
        if (err.status === 429) {
          setSpotifyStatus((prev) => ({
            ...prev,
            state: 'rate_limited',
            lastSyncAt: null,
            label: 'Spotify · Rate limited',
            errorMessage: 'Spotify rate limit exceeded. Please wait a moment and try again.',
          }));
          return;
        }
        if (err.classification === 'network_error' || err.classification === 'offline') {
          setSpotifyStatus((prev) => ({
            ...prev,
            state: 'offline',
            lastSyncAt: null,
            label: 'Spotify · Offline',
            errorMessage: 'Network connection issue communicating with Spotify.',
          }));
          return;
        }
      }

      setSpotifyStatus((prev) => ({
        ...prev,
        state: 'error',
        lastSyncAt: null,
        label: 'Spotify · Sync error',
        errorMessage: err instanceof Error ? err.message : 'Spotify synchronization failed',
      }));
    }
  }, [reconcileSpotifyData, startPolling, stopPolling]);

  // Manual retry / refresh Spotify triggers
  const handleRetrySpotifySync = async () => {
    setIsRefreshingSpotify(true);
    try {
      const token = await getSpotifyToken();
      if (token) {
        await syncSpotifyUser(token);
      }
    } finally {
      setIsRefreshingSpotify(false);
    }
  };

  const handleReconnectSpotify = () => {
    loginWithSpotify().catch((err) => {
      console.warn('Spotify reconnect failed:', err);
    });
  };

  const handleManualSpotifyRefresh = async () => {
    setIsRefreshingSpotify(true);
    try {
      const token = await getSpotifyToken();
      if (token) {
        if (
          recordsRef.current.length === 0 || 
          spotifyStatus.state === 'access_denied' || 
          spotifyStatus.state === 'error' ||
          spotifyStatus.state === 'empty_library'
        ) {
          await syncSpotifyUser(token);
        } else {
          await reconcileSpotifyData(token);
        }
      }
    } finally {
      setIsRefreshingSpotify(false);
    }
  };

  // Disconnect Spotify session cleanly
  const handleDisconnectSpotify = useCallback(() => {
    isSpotifyActiveRef.current = false;
    stopPolling();
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
  }, [stopPolling]);

  // Automatic Spotify session restoration & continuous polling loop
  useEffect(() => {
    let isCancelled = false;

    // Page Visibility API handler: registered synchronously, cleaned up synchronously
    const handleVisibilityChange = async () => {
      if (isCancelled || !isSpotifyActiveRef.current) return;

      if (document.hidden) {
        stopPolling();
      } else {
        stopPolling();
        if (spotifyStatus.state === 'access_denied' || spotifyStatus.state === 'unauthorized') {
          return;
        }
        const activeToken = await getSpotifyToken();
        if (isCancelled || !isSpotifyActiveRef.current) return;
        if (activeToken) {
          await reconcileSpotifyData(activeToken);
          if (!isCancelled && isSpotifyActiveRef.current) {
            startPolling();
          }
        } else {
          isSpotifyActiveRef.current = false;
          setSpotifyStatus((prev) => ({
            ...prev,
            state: 'disconnected',
            lastSyncAt: null,
            label: 'Spotify · Offline',
          }));
        }
      }
    };

    // 1. Synchronously register visibility listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 2. Initialize session
    getSpotifyToken()
      .then(async (token) => {
        if (!token || isCancelled) return;
        setSpotifyStatus((prev) => ({
          ...prev,
          state: 'connecting',
          lastSyncAt: null,
          label: 'Spotify · Connecting',
        }));
        await syncSpotifyUser(token);
      })
      .catch((err) => {
        isSpotifyActiveRef.current = false;
        console.warn('Spotify session initialization error:', err instanceof Error ? err.message : String(err));
        setSpotifyStatus({
          state: 'error',
          lastSyncAt: null,
          label: 'Spotify · Sync error',
          errorMessage: 'Failed to establish Spotify session',
        });
      });

    // 3. Synchronous cleanup returned directly from useEffect
    return () => {
      isCancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopPolling();
    };
  }, [reconcileSpotifyData, startPolling, stopPolling, syncSpotifyUser, spotifyStatus.state]);

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
      import('papaparse').then(({ default: Papa }) => {
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
            {summary && (preset !== 'spotify' || (spotifyStatus.state !== 'access_denied' && spotifyStatus.state !== 'connecting' && spotifyStatus.state !== 'syncing' && spotifyStatus.state !== 'error' && spotifyStatus.state !== 'unauthorized')) && (
              <span className="text-xs text-[var(--text-tertiary)] font-mono">
                {spotifyStatus.state === 'empty_library'
                  ? '0 tracks'
                  : `${summary.totalTracks.toLocaleString()} tracks · ${summary.totalArtists.toLocaleString()} artists · ${summary.totalGenres.toLocaleString()} stellar systems`}
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
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-primary)]">
                  Loading Graph Engine...
                </div>
              }
            >
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
            </Suspense>
          )}

          {/* Explicit Spotify Error or Empty Library State (never silent demo fallback) */}
          {preset === 'spotify' && records.length === 0 && (
            <div className="absolute inset-0 z-40 bg-[var(--bg-primary)]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              {spotifyStatus.state === 'connecting' || spotifyStatus.state === 'syncing' ? (
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
              ) : spotifyStatus.state === 'access_denied' ? (
                <div className="flex flex-col items-center gap-3 max-w-md">
                  <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <AlertCircle size={22} />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[var(--text-primary)]">
                    Spotify access unavailable
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                    Your Spotify account was authenticated, but Spotify isn't currently allowing this account to access this Development Mode app.
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] font-sans">
                    Ask the app owner to grant access, or try again later.
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={handleRetrySpotifySync}
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
              ) : spotifyStatus.state === 'unauthorized' ? (
                <div className="flex flex-col items-center gap-3 max-w-md">
                  <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <AlertCircle size={22} />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[var(--text-primary)]">
                    Spotify Reconnect Required
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                    Your Spotify session has expired or requires re-authentication.
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={handleReconnectSpotify}
                      className="px-4 py-2 rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                      Reconnect Spotify
                    </button>
                    <button
                      onClick={() => handlePresetChange('electronic')}
                      className="px-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      Explore Demo Universe
                    </button>
                  </div>
                </div>
              ) : spotifyStatus.state === 'rate_limited' ? (
                <div className="flex flex-col items-center gap-3 max-w-md">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <AlertCircle size={22} />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[var(--text-primary)]">
                    Spotify Rate Limited
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                    Spotify rate limit reached. Please wait a moment before trying again.
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={handleRetrySpotifySync}
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
              ) : spotifyStatus.state === 'offline' || spotifyStatus.state === 'network_error' ? (
                <div className="flex flex-col items-center gap-3 max-w-md">
                  <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <AlertCircle size={22} />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[var(--text-primary)]">
                    Spotify Connection Offline
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                    Network connectivity issue communicating with Spotify.
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={handleRetrySpotifySync}
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
                    Spotify connected
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-mono">
                    0 tracks
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                    No top tracks found for this account yet. Play music on Spotify to populate your universe or explore our curated presets.
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={handleRetrySpotifySync}
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
                      onClick={handleRetrySpotifySync}
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
              ) : null}
            </div>
          )}
        </div>

        {/* Discovery Panel */}
        <Suspense fallback={null}>
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
        </Suspense>

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
        <Suspense fallback={null}>
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
        </Suspense>

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
        <Suspense fallback={null}>
          <InsightsModal
            isOpen={isInsightsOpen}
            onClose={() => setIsInsightsOpen(false)}
            summary={summary}
            isDark={isDark}
          />
        </Suspense>
      </main>
    </div>
  );
}

export default App;
