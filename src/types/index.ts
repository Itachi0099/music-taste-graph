export interface RawTrackRecord {
  track: string;
  artist: string;
  genre: string;
  bpm?: number | null;
}

export type MusicNodeType = 'genre' | 'artist' | 'track';

export interface GraphNodeData extends Record<string, unknown> {
  label: string;
  count?: number; // For genre or artist
  bpm?: number | null;
  genre?: string;
  artist?: string;
  expanded?: boolean; // For toggling track clusters
}

export interface TasteSummary {
  totalTracks: number;
  totalArtists: number;
  totalGenres: number;
  averageBpm: number;
  topGenres: { genre: string; count: number; percentage: number }[];
  tastePersona?: string;
  bpmDistribution: { range: string; count: number }[];
}
