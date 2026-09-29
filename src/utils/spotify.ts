import type { RawTrackRecord, ListeningEvent, SpotifyPlaybackState } from '../types';
import type {
  SpotifyTrackItem,
  SpotifyTopTracksPayload,
  SpotifyRecentlyPlayedPayload,
  SpotifySeveralArtistsPayload,
  SpotifyCurrentlyPlayingPayload,
  SpotifyTokenEndpointResponse,
  SpotifyUserProfile,
} from '../types/spotify';

const DEFAULT_CLIENT_ID = '663e5f2a2950473ba037426e5343b8df';
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || DEFAULT_CLIENT_ID;

export const SPOTIFY_REDIRECT_URI =
  import.meta.env.VITE_SPOTIFY_REDIRECT_URI ||
  (import.meta.env.PROD
    ? 'https://music-taste-graph.vercel.app/'
    : 'http://127.0.0.1:5173/');

export const getRedirectUri = (): string => {
  if (import.meta.env.VITE_SPOTIFY_REDIRECT_URI) {
    return import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
  }
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    if (origin.includes('localhost:5173')) {
      return 'http://localhost:5173/';
    }
    if (origin.includes('127.0.0.1:5173')) {
      return 'http://127.0.0.1:5173/';
    }
    if (origin.includes('vercel.app')) {
      return 'https://music-taste-graph.vercel.app/';
    }
  }
  return SPOTIFY_REDIRECT_URI;
};

// Spotify Scopes for identity, sync, current playback, recently played, and top tracks
export const SPOTIFY_SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'user-read-recently-played',
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-library-read',
];

const generateRandomString = (length: number): string => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (x) => possible[x % possible.length]).join('');
};

const generateCodeChallenge = async (codeVerifier: string): Promise<string> => {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

export const loginWithSpotify = async () => {
  if (!CLIENT_ID) {
    throw new Error('Spotify Client ID is not configured (missing VITE_SPOTIFY_CLIENT_ID).');
  }

  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const redirectUri = getRedirectUri();

  // Store codeVerifier in both sessionStorage and localStorage for redirect recovery across browsers
  try {
    sessionStorage.setItem('spotify_code_verifier', codeVerifier);
    sessionStorage.setItem('spotify_redirect_uri', redirectUri);
    localStorage.setItem('spotify_code_verifier', codeVerifier);
    localStorage.setItem('spotify_redirect_uri', redirectUri);
  } catch {
    // Storage access may be restricted
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES.join(' '),
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    show_dialog: 'true',
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  window.location.href = authUrl;
};

// In-memory token management (no tokens in localStorage or sessionStorage)
let inMemoryAccessToken: string | null = null;
let tokenExpiresAt = 0;
let tokenExchangePromise: Promise<string | null> | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const getStoredSpotifyToken = (): string | null => {
  if (inMemoryAccessToken && Date.now() < tokenExpiresAt) {
    return inMemoryAccessToken;
  }
  return null;
};

export const saveTokens = (accessToken: string, expiresInSeconds: number = 3600) => {
  inMemoryAccessToken = accessToken;
  // Expire 60 seconds early to avoid race conditions
  tokenExpiresAt = Date.now() + Math.max(30, expiresInSeconds - 60) * 1000;

  // Clean any residual tokens from browser storage
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('spotify_access_token');
      localStorage.removeItem('spotify_refresh_token');
      sessionStorage.removeItem('spotify_access_token');
      sessionStorage.removeItem('spotify_refresh_token');
    } catch {
      // Storage access may be restricted
    }
  }
};

export const clearTokens = () => {
  inMemoryAccessToken = null;
  tokenExpiresAt = 0;

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('spotify_access_token');
      localStorage.removeItem('spotify_refresh_token');
      sessionStorage.removeItem('spotify_access_token');
      sessionStorage.removeItem('spotify_refresh_token');
      sessionStorage.removeItem('spotify_code_verifier');
      sessionStorage.removeItem('spotify_redirect_uri');
    } catch {
      // Storage access may be restricted
    }
  }

  // Clear server-side session cookie
  fetch('/api/auth/spotify/logout', {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {});
};

/**
 * Refreshes Spotify access token using the server-side HttpOnly session cookie (F-01, F-03)
 */
export const refreshSpotifyToken = async (): Promise<string | null> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/spotify/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (res.ok) {
        const data: SpotifyTokenEndpointResponse = await res.json();
        if (data.access_token) {
          saveTokens(data.access_token, data.expires_in);
          return data.access_token;
        }
      } else {
        // Session invalid or expired
        inMemoryAccessToken = null;
        tokenExpiresAt = 0;
      }
    } catch (err) {
      console.warn('Spotify session refresh failed:', err);
      inMemoryAccessToken = null;
      tokenExpiresAt = 0;
    } finally {
      refreshPromise = null;
    }

    return null;
  })();

  return refreshPromise;
};

/**
 * Handles Spotify PKCE Token retrieval and URL code exchange
 */
export const getSpotifyToken = async (): Promise<string | null> => {
  if (tokenExchangePromise) {
    return tokenExchangePromise;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const error = searchParams.get('error');
  if (error) {
    window.history.replaceState(null, '', window.location.pathname);
    throw new Error(`Spotify authorization error: ${error}`);
  }

  const code = searchParams.get('code');
  if (!code) {
    // If we have an active in-memory token, return it
    const stored = getStoredSpotifyToken();
    if (stored) return stored;

    // Otherwise, check if an existing session cookie is present and can be renewed
    return refreshSpotifyToken();
  }

  // Handle OAuth code callback
  window.history.replaceState(null, '', window.location.pathname);

  const verifier =
    sessionStorage.getItem('spotify_code_verifier') ||
    localStorage.getItem('spotify_code_verifier');
  const redirectUri =
    sessionStorage.getItem('spotify_redirect_uri') ||
    localStorage.getItem('spotify_redirect_uri') ||
    getRedirectUri();

  try {
    sessionStorage.removeItem('spotify_code_verifier');
    sessionStorage.removeItem('spotify_redirect_uri');
    localStorage.removeItem('spotify_code_verifier');
    localStorage.removeItem('spotify_redirect_uri');
  } catch {
    // Storage access may be restricted
  }

  if (!verifier) {
    const existing = getStoredSpotifyToken();
    if (existing) return existing;
    return refreshSpotifyToken();
  }

  tokenExchangePromise = (async () => {
    try {
      let data: SpotifyTokenEndpointResponse | null = null;
      try {
        const backendResponse = await fetch('/api/auth/spotify/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ code, code_verifier: verifier, redirect_uri: redirectUri }),
        });

        if (backendResponse.ok) {
          data = await backendResponse.json();
        }
      } catch (backendErr) {
        console.warn('Backend token exchange route unavailable, falling back to direct PKCE:', backendErr);
      }

      // If backend token exchange route is unavailable (e.g. dev server without server process), fallback to direct Spotify PKCE
      if (!data?.access_token) {
        const params = new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: CLIENT_ID,
          code_verifier: verifier,
        });

        const spotifyRes = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });

        if (!spotifyRes.ok) {
          const errorData = await spotifyRes.json().catch(() => ({}));
          throw new Error(errorData.error_description || errorData.error || 'Failed to exchange authorization code');
        }

        data = await spotifyRes.json();
      }

      if (data?.access_token) {
        saveTokens(data.access_token, data.expires_in);
        return data.access_token;
      }

      throw new Error('No access token returned from Spotify authentication');
    } finally {
      tokenExchangePromise = null;
    }
  })();

  return tokenExchangePromise;
};

export const getAccessTokenFromUrl = getSpotifyToken;

// Rate-limiting backoff and 401 retry state (R-03)
let rateLimitResetTime = 0;
let consecutiveAuthFailures = 0;

// Helper to make authenticated requests with bounded 401 retry & 429 backoff
async function spotifyFetch(url: string, token: string): Promise<Response> {
  const now = Date.now();
  if (now < rateLimitResetTime) {
    const waitSec = Math.ceil((rateLimitResetTime - now) / 1000);
    return new Response(JSON.stringify({ error: 'Rate limit active', retryAfter: waitSec }), {
      status: 429,
      headers: { 'Retry-After': String(waitSec) },
    });
  }

  let activeToken = token;
  let res = await fetch(url, {
    headers: { Authorization: `Bearer ${activeToken}` },
  });

  // Handle 401 Unauthorized -> Refresh token
  if (res.status === 401) {
    consecutiveAuthFailures++;
    if (consecutiveAuthFailures <= 2) {
      const refreshed = await refreshSpotifyToken();
      if (refreshed) {
        activeToken = refreshed;
        consecutiveAuthFailures = 0;
        res = await fetch(url, {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
      }
    }
  } else {
    consecutiveAuthFailures = 0;
  }

  // Handle 429 Rate Limit
  if (res.status === 429) {
    const retryAfterHeader = res.headers.get('Retry-After');
    const retryAfterSec = retryAfterHeader
      ? Math.min(Math.max(parseInt(retryAfterHeader, 10), 1), 300)
      : 5;
    rateLimitResetTime = Date.now() + retryAfterSec * 1000;
    console.warn(`Spotify rate limit reached (429). Bounded backoff for ${retryAfterSec}s.`);
  }

  return res;
}

/**
 * Resolves artist genres via open iTunes directory fallback if Spotify returns empty genres
 */
async function resolveArtistGenres(artistNames: string[], knownGenreMap: Record<string, string>): Promise<Record<string, string>> {
  const missing = artistNames.filter((name) => !knownGenreMap[name] || knownGenreMap[name] === 'Unknown');
  if (missing.length === 0) return knownGenreMap;

  await Promise.allSettled(
    missing.slice(0, 20).map(async (artistName) => {
      try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=musicArtist&limit=1`);
        if (res.ok) {
          const itunesData = await res.json();
          const genre = itunesData.results?.[0]?.primaryGenreName;
          if (genre) {
            knownGenreMap[artistName] = genre;
          }
        }
      } catch {
        // Ignore fallback errors
      }
    })
  );

  return knownGenreMap;
}

/**
 * Fetches the authenticated user profile (/v1/me) to establish stable identity and isolation.
 * Note: Never log access tokens, refresh tokens, cookies, or user credentials.
 */
export const fetchSpotifyUserProfile = async (token: string): Promise<SpotifyUserProfile | null> => {
  try {
    const res = await spotifyFetch('https://api.spotify.com/v1/me', token);
    if (!res.ok) {
      return null;
    }
    const data: SpotifyUserProfile = await res.json();
    return {
      id: data.id,
      display_name: data.display_name || null,
      email: data.email,
      product: data.product,
      country: data.country,
    };
  } catch (err) {
    console.warn('Failed to fetch Spotify user profile:', err instanceof Error ? err.message : String(err));
    return null;
  }
};

/**
 * Fetches user's current Spotify playback state
 */
export const fetchCurrentlyPlaying = async (token: string): Promise<SpotifyPlaybackState | null> => {
  try {
    const res = await spotifyFetch('https://api.spotify.com/v1/me/player/currently-playing', token);
    if (res.status === 204 || res.status === 404) {
      return {
        isPlaying: false,
        trackId: null,
        trackTitle: null,
        artistName: null,
        genre: null,
        progressMs: 0,
        durationMs: 0,
        lastPolledAt: Date.now(),
      };
    }

    if (!res.ok) return null;
    const data: SpotifyCurrentlyPlayingPayload = await res.json();
    if (!data || !data.item) {
      return {
        isPlaying: false,
        trackId: null,
        trackTitle: null,
        artistName: null,
        genre: null,
        progressMs: 0,
        durationMs: 0,
        lastPolledAt: Date.now(),
      };
    }

    const item = data.item;
    const artistName = item.artists?.[0]?.name || 'Unknown Artist';

    return {
      isPlaying: Boolean(data.is_playing),
      trackId: item.id || `spotify-${item.name}`,
      trackTitle: item.name,
      artistName,
      genre: null,
      progressMs: data.progress_ms || 0,
      durationMs: item.duration_ms || 0,
      albumArt: item.album?.images?.[0]?.url,
      spotifyUrl: item.external_urls?.spotify,
      lastPolledAt: Date.now(),
    };
  } catch (err) {
    console.warn('Error fetching currently playing track:', err);
    return null;
  }
};

/**
 * Fetches recently played tracks incrementally since a given timestamp
 */
export const fetchRecentlyPlayedEvents = async (
  token: string,
  afterTimestamp?: number
): Promise<ListeningEvent[]> => {
  try {
    let url = 'https://api.spotify.com/v1/me/player/recently-played?limit=30';
    if (afterTimestamp && afterTimestamp > 0) {
      url += `&after=${afterTimestamp}`;
    }

    const res = await spotifyFetch(url, token);
    if (!res.ok) return [];

    const data: SpotifyRecentlyPlayedPayload = await res.json();
    if (!data.items || !Array.isArray(data.items)) return [];

    const artistNames = data.items
      .map((item) => item.track?.artists?.[0]?.name)
      .filter((name): name is string => Boolean(name));
    const genreMap = await resolveArtistGenres([...new Set(artistNames)], {});

    return data.items.map((item) => {
      const track: SpotifyTrackItem = item.track;
      const artist = track?.artists?.[0]?.name || 'Unknown Artist';
      const playedAt = item.played_at || new Date().toISOString();
      const genre = genreMap[artist] || 'Unknown'; // R-04: Do not default unknown artists to Electronic

      return {
        id: `${track.id || track.name}_${playedAt}`,
        trackId: track.id || `track-${track.name}`,
        trackTitle: track.name,
        artistName: artist,
        genre,
        playedAt,
        durationMs: track.duration_ms,
        source: 'spotify_recent',
        bpm: null,
      };
    });
  } catch (err) {
    console.warn('Error fetching recently played tracks:', err);
    return [];
  }
};

/**
 * Fetches top tracks and builds initial normalized library
 */
export const fetchSpotifyTopTracks = async (token: string): Promise<RawTrackRecord[]> => {
  const response = await spotifyFetch('https://api.spotify.com/v1/me/top/tracks?limit=35&time_range=medium_term', token);
  if (!response.ok) throw new Error('Failed to fetch Spotify tracks');
  const data: SpotifyTopTracksPayload = await response.json();

  let genreMap: Record<string, string> = {};
  const artistIds = [...new Set(data.items.map((item) => item.artists[0]?.id).filter(Boolean))].slice(0, 50);

  if (artistIds.length > 0) {
    try {
      const artistsResponse = await spotifyFetch(`https://api.spotify.com/v1/artists?ids=${artistIds.join(',')}`, token);
      if (artistsResponse.ok) {
        const artistsData: SpotifySeveralArtistsPayload = await artistsResponse.json();
        artistsData.artists?.forEach((artist) => {
          if (artist?.name && artist.genres?.length > 0) {
            genreMap[artist.name] = artist.genres[0];
          }
        });
      }
    } catch {
      // Fallback to resolveArtistGenres below
    }
  }

  const uniqueArtists = [...new Set(data.items.map((item) => item.artists[0]?.name).filter(Boolean))] as string[];
  genreMap = await resolveArtistGenres(uniqueArtists, genreMap);

  return data.items.map((item) => ({
    id: item.id,
    track: item.name,
    artist: item.artists[0]?.name || 'Unknown Artist',
    genre: genreMap[item.artists[0]?.name] || 'Unknown', // R-04: Do not default unknown artists to Electronic
    bpm: null,
    spotifyUrl: item.external_urls?.spotify,
    album: item.album?.name,
    duration: formatDurationMs(item.duration_ms),
  }));
};

function formatDurationMs(ms?: number): string {
  if (!ms) return '3:45';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
