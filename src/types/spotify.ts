// Strongly typed Spotify Web API schemas for Celestial Music Universe

export interface SpotifyExternalUrls {
  spotify?: string;
}

export interface SpotifyImage {
  url: string;
  height?: number;
  width?: number;
}

export interface SpotifyArtistSimple {
  id: string;
  name: string;
  external_urls?: SpotifyExternalUrls;
}

export interface SpotifyFullArtist {
  id: string;
  name: string;
  genres: string[];
  external_urls?: SpotifyExternalUrls;
  images?: SpotifyImage[];
  popularity?: number;
}

export interface SpotifyAlbumSimple {
  id: string;
  name: string;
  images?: SpotifyImage[];
  release_date?: string;
  external_urls?: SpotifyExternalUrls;
}

export interface SpotifyTrackItem {
  id: string;
  name: string;
  duration_ms: number;
  artists: SpotifyArtistSimple[];
  album?: SpotifyAlbumSimple;
  external_urls?: SpotifyExternalUrls;
  is_playable?: boolean;
}

export interface SpotifyPlayHistoryItem {
  track: SpotifyTrackItem;
  played_at: string;
}

export interface SpotifyCurrentlyPlayingPayload {
  is_playing: boolean;
  progress_ms?: number;
  item?: SpotifyTrackItem | null;
}

export interface SpotifyTopTracksPayload {
  items: SpotifyTrackItem[];
}

export interface SpotifyRecentlyPlayedPayload {
  items: SpotifyPlayHistoryItem[];
}

export interface SpotifySeveralArtistsPayload {
  artists: SpotifyFullArtist[];
}

export interface SpotifyTokenEndpointResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface SpotifyUserProfile {
  id: string;
  display_name?: string | null;
  email?: string;
  product?: string;
  country?: string;
}

