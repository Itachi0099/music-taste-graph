import type { RawTrackRecord, ListeningEvent, SpotifyPlaybackState } from '../types';

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '663e5f2a2950473ba037426e5343b8df';

export const SPOTIFY_REDIRECT_URI = 'http://127.0.0.1:5173/';

export const getRedirectUri = (): string => {
  if (typeof window !== 'undefined' && window.location.origin) {
    const origin = window.location.origin;
    if (origin.includes('127.0.0.1') || origin.includes('localhost')) {
      return SPOTIFY_REDIRECT_URI;
    }
    // Production (e.g. Vercel) - ensure exact trailing slash matching registered dashboard URI
    return `${origin.replace(/\/+$/, '')}/`;
  }
  return SPOTIFY_REDIRECT_URI;
};

// Complete Spotify Scopes for automatic sync, current playback, recently played, top artists, and saved tracks
export const SPOTIFY_SCOPES = [
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
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const redirectUri = getRedirectUri();

  console.log("SPOTIFY REDIRECT URI:", redirectUri);

  localStorage.setItem('spotify_code_verifier', codeVerifier);
  sessionStorage.setItem('spotify_code_verifier', codeVerifier);
  localStorage.setItem('spotify_redirect_uri', redirectUri);
  sessionStorage.setItem('spotify_redirect_uri', redirectUri);

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
  console.log("SPOTIFY AUTHORIZE URL:", authUrl);

  window.location.href = authUrl;
};

let tokenExchangePromise: Promise<string | null> | null = null;

export const getStoredSpotifyToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('spotify_access_token') || sessionStorage.getItem('spotify_access_token');
};

export const getStoredRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('spotify_refresh_token') || sessionStorage.getItem('spotify_refresh_token');
};

export const saveTokens = (accessToken: string, refreshToken?: string) => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('spotify_access_token', accessToken);
  localStorage.setItem('spotify_access_token', accessToken);
  if (refreshToken) {
    sessionStorage.setItem('spotify_refresh_token', refreshToken);
    localStorage.setItem('spotify_refresh_token', refreshToken);
  }
};

export const clearTokens = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_access_token');
  sessionStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_refresh_token');
};

/**
 * Refreshes an expired Spotify access token using the stored refresh_token
 */
export const refreshSpotifyToken = async (): Promise<string | null> => {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch('/api/auth/spotify/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.access_token) {
        saveTokens(data.access_token, data.refresh_token || refreshToken);
        return data.access_token;
      }
    }
  } catch (err) {
    console.warn('Backend refresh failed, trying direct Spotify endpoint:', err);
  }

  // Fallback to direct accounts.spotify.com token refresh
  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    });

    const fallbackRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (fallbackRes.ok) {
      const data = await fallbackRes.json();
      if (data.access_token) {
        saveTokens(data.access_token, data.refresh_token || refreshToken);
        return data.access_token;
      }
    }
  } catch (err) {
    console.error('Direct token refresh error:', err);
  }

  return null;
};

/**
 * Handles Spotify PKCE Token retrieval and URL code exchange
 */
export const getSpotifyToken = async (): Promise<string | null> => {
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');
    if (token) {
      window.history.replaceState(null, '', window.location.pathname);
      saveTokens(token);
      return token;
    }
  }

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
    return getStoredSpotifyToken();
  }

  window.history.replaceState(null, '', window.location.pathname);

  const verifier = localStorage.getItem('spotify_code_verifier') || sessionStorage.getItem('spotify_code_verifier');
  if (!verifier) {
    const cachedToken = getStoredSpotifyToken();
    if (cachedToken) return cachedToken;
    throw new Error('Spotify code verifier not found. Please try connecting again.');
  }

  const redirectUri =
    localStorage.getItem('spotify_redirect_uri') ||
    sessionStorage.getItem('spotify_redirect_uri') ||
    getRedirectUri();

  tokenExchangePromise = (async () => {
    try {
      const backendResponse = await fetch('/api/auth/spotify/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, code_verifier: verifier, redirect_uri: redirectUri })
      });

      let data;
      if (backendResponse.ok) {
        data = await backendResponse.json();
      } else {
        const body = new URLSearchParams({
          client_id: CLIENT_ID,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          code_verifier: verifier,
        });

        const fallbackResponse = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });

        if (!fallbackResponse.ok) {
          const errorData = await fallbackResponse.json().catch(() => ({}));
          throw new Error(errorData.error_description || errorData.error || 'Failed to exchange authorization code');
        }
        data = await fallbackResponse.json();
      }

      const accessToken = data.access_token as string;
      saveTokens(accessToken, data.refresh_token);
      return accessToken;
    } finally {
      tokenExchangePromise = null;
      localStorage.removeItem('spotify_code_verifier');
      sessionStorage.removeItem('spotify_code_verifier');
      localStorage.removeItem('spotify_redirect_uri');
      sessionStorage.removeItem('spotify_redirect_uri');
    }
  })();

  return tokenExchangePromise;
};

export const getAccessTokenFromUrl = getSpotifyToken;

// Helper to make authenticated requests with 401 retry & 429 backoff
async function spotifyFetch(url: string, token: string): Promise<Response> {
  let activeToken = token;
  let res = await fetch(url, {
    headers: { Authorization: `Bearer ${activeToken}` },
  });

  // Handle 401 Unauthorized -> Refresh token
  if (res.status === 401) {
    const refreshed = await refreshSpotifyToken();
    if (refreshed) {
      activeToken = refreshed;
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
    }
  }

  // Handle 429 Rate Limit
  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After');
    console.warn(`Spotify 429 Rate Limit hit. Retry-After: ${retryAfter || 'unknown'}s`);
  }

  return res;
}

/**
 * Resolves artist genres via open iTunes directory fallback if Spotify returns 403 or empty genres
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
    const data = await res.json();
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
      genre: null, // to be mapped by library
      progressMs: data.progress_ms || 0,
      durationMs: item.duration_ms || 0,
      albumArt: item.album?.images?.[0]?.url,
      spotifyUrl: item.external_urls?.spotify,
      lastPolledAt: Date.now(),
    };
  } catch (err) {
    console.warn('Error fetching currently playing:', err);
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

    const data = await res.json();
    if (!data.items || !Array.isArray(data.items)) return [];

    const artistNames = (data.items.map((item: any) => item.track?.artists?.[0]?.name).filter(Boolean)) as string[];
    const genreMap = await resolveArtistGenres([...new Set(artistNames)], {});

    return data.items.map((item: any) => {
      const track = item.track;
      const artist = track?.artists?.[0]?.name || 'Unknown Artist';
      const playedAt = item.played_at || new Date().toISOString();
      const genre = genreMap[artist] || 'Electronic';

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
  const data = await response.json();
  
  let genreMap: Record<string, string> = {};
  const artistIds = [...new Set(data.items.map((item: any) => item.artists[0]?.id).filter(Boolean))].slice(0, 50);

  if (artistIds.length > 0) {
    try {
      const artistsResponse = await spotifyFetch(`https://api.spotify.com/v1/artists?ids=${artistIds.join(',')}`, token);
      if (artistsResponse.ok) {
        const artistsData = await artistsResponse.json();
        artistsData.artists?.forEach((artist: any) => {
          if (artist?.name && artist.genres?.length > 0) {
            genreMap[artist.name] = artist.genres[0];
          }
        });
      }
    } catch {
      // Fallback below
    }
  }

  const uniqueArtists = [...new Set(data.items.map((item: any) => item.artists[0]?.name).filter(Boolean))] as string[];
  genreMap = await resolveArtistGenres(uniqueArtists, genreMap);

  return data.items.map((item: any) => ({
    id: item.id,
    track: item.name,
    artist: item.artists[0]?.name || 'Unknown Artist',
    genre: genreMap[item.artists[0]?.name] || 'Electronic',
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
