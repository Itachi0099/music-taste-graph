// Canonical, normalized domain models for Celestial Music Universe

export interface RawTrackRecord {
  id?: string;
  track: string;
  artist: string;
  genre: string;
  subgenre?: string;
  bpm?: number | null;
  mood?: string;
  energy?: number; // 0 to 1
  valence?: number; // 0 to 1 (musical positiveness)
  album?: string;
  year?: number;
  duration?: string; // e.g. "6:42"
  spotifyUrl?: string;
  playedAt?: string; // ISO 8601 string if from listening history
}

export type MusicNodeType = 'genre' | 'subgenre' | 'artist' | 'track';

export interface GraphNodeData extends Record<string, unknown> {
  id?: string;
  label: string;
  count?: number; // For genre or artist
  bpm?: number | null;
  genre?: string;
  subgenre?: string;
  artist?: string;
  expanded?: boolean; // For toggling track clusters
  mood?: string;
  color?: string;
  energy?: number;
  highlighted?: boolean;
  album?: string;
  year?: number;
  duration?: string;
  spotifyUrl?: string;
  isDark?: boolean;
  selected?: boolean;
  dimmed?: boolean;
}

// -------------------------------------------------------------
// Canonical Normalized Music Entities
// -------------------------------------------------------------
export interface Genre {
  id: string;
  name: string;
  trackCount: number;
  artistCount: number;
  color?: string;
  relatedGenreNames: string[];
}

export interface Artist {
  id: string;
  name: string;
  primaryGenre: string;
  genres: string[];
  trackCount: number;
  spotifyUrl?: string;
}

export interface Track {
  id: string;
  title: string;
  artistName: string;
  genre: string;
  subgenre?: string;
  album?: string;
  year?: number;
  durationMs?: number;
  durationFormatted?: string;
  bpm?: number | null;
  spotifyUrl?: string;
  source: 'spotify' | 'csv' | 'preset' | 'discovery';
}

// -------------------------------------------------------------
// Real-time Listening Event Model
// -------------------------------------------------------------
export interface ListeningEvent {
  id: string; // deduplicated stable identifier e.g. trackId_playedAt
  trackId: string;
  trackTitle: string;
  artistName: string;
  genre: string;
  subgenre?: string;
  playedAt: string; // ISO timestamp
  durationMs?: number;
  source: 'spotify_recent' | 'spotify_live' | 'csv_history' | 'preset_playback';
  bpm?: number | null;
}

// Active Playback State (subtle celestial influence, not a huge popup)
export interface SpotifyPlaybackState {
  isPlaying: boolean;
  trackId: string | null;
  trackTitle: string | null;
  artistName: string | null;
  genre: string | null;
  progressMs: number;
  durationMs: number;
  bpm?: number | null;
  albumArt?: string;
  spotifyUrl?: string;
  lastPolledAt: number;
}

// Spotify Connection Status
export type SpotifyConnectionState = 
  | 'disconnected'
  | 'connecting'
  | 'live'
  | 'updated_recently'
  | 'reconnecting'
  | 'rate_limited'
  | 'offline';

export interface SpotifyStatusInfo {
  state: SpotifyConnectionState;
  lastSyncAt: number | null;
  label: string;
  retryAfterSeconds?: number;
}

// -------------------------------------------------------------
// Normalized User Taste Profile
// -------------------------------------------------------------
export interface TasteProfile {
  // Statistical distributions
  genreDistribution: Record<string, number>; // e.g. { 'Techno': 0.38, 'House': 0.25 }
  artistAffinity: Record<string, number>;    // e.g. { 'Bicep': 0.95 }
  subgenreDistribution: Record<string, number>;

  // Derived behavioral metrics
  explorationScore: number;    // 0.0 - 1.0 (novelty seeking vs repeat listening)
  diversityScore: number;      // 0.0 - 1.0 (entropy across genres)
  genreGravity: Record<string, number>; // Importance weighting for celestial sun size & brightness
  artistConcentration: number; // 0.0 - 1.0 (few artists vs broad listening)
  repeatBehavior: number;      // 0.0 - 1.0
  listeningIntensity: number;  // 0.0 - 1.0
  
  // Audio vibe profiles (deterministic derivation)
  energyProfile: number;       // 0 - 100
  grooveProfile: number;       // 0 - 100
  chillProfile: number;        // 0 - 100
  intensityProfile: number;    // 0 - 100
  
  bpmRange: {
    min: number;
    max: number;
    preferred: number;
  };

  // Compatibility fields for legacy consumers
  genres: Record<string, number>;
  artists: Record<string, number>;
  subgenres: Record<string, number>;
  totalTracks: number;
  uniqueArtists: number;
  uniqueGenres: number;
}

export interface TasteSummary {
  totalTracks: number;
  totalArtists: number;
  totalGenres: number;
  averageBpm: number;
  topGenres: { genre: string; count: number; percentage: number; color?: string }[];
  tastePersona?: string;
  bpmDistribution: { range: string; count: number }[];
  dominantMood?: string;
  moodBreakdown: { mood: string; count: number; percentage: number; color: string }[];
  energyScore?: number; // 0 - 100
  tasteProfile?: TasteProfile;
}

export interface RecommendationItem {
  id: string;
  type: 'track' | 'artist' | 'genre';
  title: string;
  subtitle: string;
  genre: string;
  bpm?: number | null;
  mood: string;
  matchScore: number; // e.g. 96%
  reason: string;
  energy?: number;
}

// -------------------------------------------------------------
// Celestial Universe System Models
// -------------------------------------------------------------
export interface UniverseGenreSystem {
  id: string;
  name: string;
  trackCount: number;
  artistCount: number;
  color: string;
  celestialColor?: import('../utils/celestialColors').CelestialColorIdentity;
  x: number;
  y: number;
  radius: number;
  activityLevel?: number; // 0.0 - 1.0 based on recent listening
  brightness?: number;   // Visual glow intensity
  subgenres: UniverseSubgenre[];
  artists: UniverseArtist[];
}

export interface UniverseSubgenre {
  id: string;
  name: string;
  parentGenre: string;
  trackCount: number;
  distance: number;
  angle: number;
  x: number;
  y: number;
  tier: 'planet' | 'moon';
  celestialColor?: import('../utils/celestialColors').CelestialColorIdentity;
}

export interface UniverseArtist {
  id: string;
  name: string;
  primaryGenre: string;
  secondaryGenres: string[];
  trackCount: number;
  x: number;
  y: number;
  radius: number;
  tracks: UniverseTrack[];
  bridgeGenre?: string;
  celestialColor?: import('../utils/celestialColors').CelestialColorIdentity;
  isCurrentlyPlaying?: boolean;
  // Planetary orbital mechanics
  orbitRadius?: number;
  orbitAngle?: number;
  orbitSpeed?: number;
  baseX?: number;
  baseY?: number;
  parentSubgenre?: string;
  tasteImportance?: number; // 0.0 - 1.0 importance in user taste
  recencyFactor?: number;   // 0.0 - 1.0 listening activity/recency
  isBridge?: boolean;
  bridgeSaddle?: {
    saddleX: number;
    saddleY: number;
    axisX: number;
    axisY: number;
    perpX: number;
    perpY: number;
    semiMajor: number;
    semiMinor: number;
    orbitSpeed: number;
    initialAngle: number;
  };
}

export interface UniverseTrack {
  id: string;
  title: string;
  artist: string;
  genre: string;
  subgenre?: string;
  bpm?: number | null;
  duration?: string;
  album?: string;
  year?: number;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
  x: number;
  y: number;
  spotifyUrl?: string;
  celestialColor?: import('../utils/celestialColors').CelestialColorIdentity;
  isCurrentlyPlaying?: boolean;
}

export type AsteroidType = 'obscure_artist' | 'track_cluster' | 'niche_subgenre' | 'cross_genre' | 'peripheral_track';

export interface UniverseAsteroid {
  id: string;
  name: string;
  type: AsteroidType;
  parentGenre: string;
  relatedGenre?: string;
  artist?: string;
  trackCount: number;
  bpm?: number | null;
  reasons: string[];
  sampleTracks?: Array<{ title: string; album?: string; year?: number; duration?: string; spotifyUrl?: string }>;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
  radius: number; // small: 3.5px, medium: 5.5px, large: 8.5px
  vertices: Array<{ x: number; y: number }>;
  color: string;
  celestialColor?: import('../utils/celestialColors').CelestialColorIdentity;
}

export type MeteorEventType = 
  | 'new_discovery'       // Recommendation entering user universe
  | 'recently_played'     // Recently heard track passing through
  | 'cross_genre_link'    // Traveling bridge between two genres
  | 'new_import'          // Newly imported track
  | 'listening_transition'; // Transition between two tracks

export interface UniverseMeteor {
  id: string;
  title: string;
  artist: string;
  genre: string;
  subgenre?: string;
  eventType: MeteorEventType;
  reason: string;
  sourceGenre?: string;
  targetGenre?: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  speed: number;
  progress: number; // 0.0 -> 1.0
  trailLength: number;
  history: Array<{ x: number; y: number; alpha: number }>;
  color: string;
  celestialColor?: import('../utils/celestialColors').CelestialColorIdentity;
  createdAt: number; // timestamp
  destinationAsteroid?: UniverseAsteroid;
}

export type ZoomLevel = 1 | 2 | 3 | 4;

export interface CelestialUniverseData {
  genres: UniverseGenreSystem[];
  artists: UniverseArtist[];
  bridges: Array<{ artist: UniverseArtist; genreA: string; genreB: string }>;
  allTracks: UniverseTrack[];
  discoveries?: CelestialDiscoverySystem[];
  asteroids?: UniverseAsteroid[];
  meteors?: UniverseMeteor[];
}

export type DiscoveryCategory = 'nearby' | 'adjacent' | 'unknown';

export interface DiscoveryRecommendation {
  id: string;
  artistId?: string;
  trackId?: string;
  artist: string;
  genre: string;
  subgenre?: string;
  bpm?: number;
  category: DiscoveryCategory;
  score: number; // 0.0 - 1.0 (Taste Match)
  distance: number; // Distance in spatial universe
  reasons: string[];
  sampleTracks: Array<{
    title: string;
    album?: string;
    duration?: string;
    bpm?: number;
    year?: number;
    spotifyUrl?: string;
  }>;
  spotifyUrl?: string;
}

export interface CelestialDiscoverySystem {
  id: string;
  recommendation: DiscoveryRecommendation;
  anchorGenre: string;
  x: number;
  y: number;
  radius: number;
  orbitAngle: number;
  orbitDistance: number;
  color: string;
  celestialColor?: import('../utils/celestialColors').CelestialColorIdentity;
}

export type UniverseSelection = 
  | { type: 'genre'; item: UniverseGenreSystem }
  | { type: 'subgenre'; item: UniverseSubgenre }
  | { type: 'artist'; item: UniverseArtist }
  | { type: 'track'; item: UniverseTrack }
  | { type: 'discovery'; item: CelestialDiscoverySystem }
  | { type: 'asteroid'; item: UniverseAsteroid }
  | { type: 'meteor'; item: UniverseMeteor }
  | null;

