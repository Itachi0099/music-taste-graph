import type { Artist } from '../types';

export interface MusicProvider {
  name: string;
  isAvailable(): boolean;
  fetchArtistMetadata?(artistName: string): Promise<Partial<Artist> | null>;
  searchSimilarArtists?(artistName: string, genre: string): Promise<string[]>;
}

export interface SpotifyAuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}
