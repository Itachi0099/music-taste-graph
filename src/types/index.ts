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

// Celestial Universe System Model
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
  tier: 'planet' | 'moon'; // strong related = planet, minor = moon
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
  // When an artist bridges two major genres
  bridgeGenre?: string;
  celestialColor?: import('../utils/celestialColors').CelestialColorIdentity;
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
  sampleTracks?: Array<{ title: string; album?: string; year?: number; duration?: string }>;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
  radius: number; // small: 3.5px, medium: 5.5px, large: 8.5px
  vertices: Array<{ x: number; y: number }>; // Irregular asteroid silhouette offsets
  color: string;
  celestialColor?: import('../utils/celestialColors').CelestialColorIdentity;
}

export type MeteorEventType = 
  | 'new_discovery'       // Recommendation entering user universe
  | 'recently_played'     // Recently heard track passing through
  | 'cross_genre_link'    // Traveling bridge between two genres
  | 'newly_imported';     // Newly imported track

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
  destinationAsteroid?: UniverseAsteroid; // Becomes this when reaches destination!
}

export type ZoomLevel = 1 | 2 | 3 | 4; // 1: Universe, 2: Genre System, 3: Artist System, 4: Track

export interface CelestialUniverseData {
  genres: UniverseGenreSystem[];
  artists: UniverseArtist[];
  bridges: Array<{ artist: UniverseArtist; genreA: string; genreB: string }>;
  allTracks: UniverseTrack[];
  discoveries?: CelestialDiscoverySystem[];
  asteroids?: UniverseAsteroid[];
  meteors?: UniverseMeteor[];
}

// User Normalized Taste Profile
export interface TasteProfile {
  genres: Record<string, number>; // normalized weights, e.g. techno: 0.34
  artists: Record<string, number>; // artist familiarity/weight
  subgenres: Record<string, number>;
  bpmRange: {
    min: number;
    max: number;
    preferred: number;
  };
  totalTracks: number;
  uniqueArtists: number;
}

// Recommendation Category
export type DiscoveryCategory = 'nearby' | 'adjacent' | 'unknown';

// Structured Recommendation Item from Engine
export interface DiscoveryRecommendation {
  id: string;
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

// Discovery System in the Celestial Universe
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

