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
import { SpotifyApiError, logSpotifySyncDiagnostic, sanitizeEndpoint } from './spotifyError';
import {
  classifyCanonicalGenre,
  diagnoseArtistGenre,
} from './genreClassifier';

export { SpotifyApiError, classifySpotifyStatus, getSpotifyStatusLabel, logSpotifySyncDiagnostic } from './spotifyError';
export {
  classifyCanonicalGenre,
  diagnoseArtistGenre,
  CURATED_ARTIST_OVERRIDES,
  cleanGenreString,
} from './genreClassifier';

const DEFAULT_CLIENT_ID = '663e5f2a2950473ba037426e5343b8df';
const CLIENT_ID = import.meta.env?.VITE_SPOTIFY_CLIENT_ID || DEFAULT_CLIENT_ID;

export const SPOTIFY_REDIRECT_URI =
  import.meta.env?.VITE_SPOTIFY_REDIRECT_URI ||
  (import.meta.env?.PROD
    ? 'https://music-taste-graph.vercel.app/'
    : 'http://127.0.0.1:5173/');

export const getRedirectUri = (): string => {
  if (import.meta.env?.VITE_SPOTIFY_REDIRECT_URI) {
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
  resetSpotifyRateLimitState();

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
      const refreshUrl =
        typeof window !== 'undefined' && window.location?.origin
          ? '/api/auth/spotify/refresh'
          : 'http://localhost/api/auth/spotify/refresh';
      const res = await fetch(refreshUrl, {
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

export interface Spotify429Metadata {
  timestamp: number;
  endpoint: string;
  retryAfterSec: number;
  reason: string;
  isQuotaExceeded: boolean;
}

let last429Metadata: Spotify429Metadata | null = null;
let inMemoryUserProfile: SpotifyUserProfile | null = null;
let inMemoryTopTracks: RawTrackRecord[] | null = null;

export const getSpotifyRateLimitRemainingMs = (): number => Math.max(0, rateLimitResetTime - Date.now());
export const isSpotifyRateLimited = (): boolean => Date.now() < rateLimitResetTime;
export const getLast429Metadata = (): Spotify429Metadata | null => (last429Metadata ? { ...last429Metadata } : null);

export const resetSpotifyRateLimitState = () => {
  rateLimitResetTime = 0;
  consecutiveAuthFailures = 0;
  last429Metadata = null;
  inMemoryUserProfile = null;
  inMemoryTopTracks = null;
  inMemoryArtistGenreCache.clear();
};

// Dev-safe request instrumentation (timestamps and request sequence numbers, NEVER logging tokens)
let requestSeq = 0;
function logSpotifyRequest(endpoint: string) {
  requestSeq++;
  const timestamp = new Date().toISOString();
  console.log(`[SpotifySync #${requestSeq}] [${timestamp}] Request: ${sanitizeEndpoint(endpoint)}`);
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Helper to make authenticated requests with bounded 401 retry & 429 backoff
export async function spotifyFetch(url: string, token: string, timeoutMs = 8000): Promise<Response> {
  const endpointPath = sanitizeEndpoint(url);
  const now = Date.now();
  if (now < rateLimitResetTime) {
    const waitSec = Math.ceil((rateLimitResetTime - now) / 1000);
    logSpotifySyncDiagnostic('429', endpointPath, `${waitSec}s active cooldown`);
    return new Response(
      JSON.stringify({
        error: {
          message: last429Metadata?.reason || 'Rate limit active',
          reason: last429Metadata?.reason || 'RATE_LIMITED',
        },
        retryAfter: waitSec,
      }),
      {
        status: 429,
        headers: { 'Retry-After': String(waitSec), 'Content-Type': 'application/json' },
      }
    );
  }

  logSpotifyRequest(endpointPath);

  let activeToken = token;
  let res: Response;
  try {
    res = await fetchWithTimeout(url, {
      headers: { Authorization: `Bearer ${activeToken}` },
    }, timeoutMs);
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    logSpotifySyncDiagnostic('network', endpointPath, errMessage);
    throw new SpotifyApiError(0, endpointPath, errMessage);
  }

  // Handle 401 Unauthorized -> Refresh token
  if (res.status === 401) {
    consecutiveAuthFailures++;
    if (consecutiveAuthFailures <= 2) {
      logSpotifyRequest('/api/auth/spotify/refresh (re-authenticating)');
      const refreshed = await refreshSpotifyToken();
      if (refreshed) {
        activeToken = refreshed;
        consecutiveAuthFailures = 0;
        try {
          res = await fetchWithTimeout(url, {
            headers: { Authorization: `Bearer ${activeToken}` },
          }, timeoutMs);
        } catch (err: unknown) {
          const errMessage = err instanceof Error ? err.message : String(err);
          logSpotifySyncDiagnostic('network', endpointPath, errMessage);
          throw new SpotifyApiError(0, endpointPath, errMessage);
        }
      }
    }
    if (res.status === 401) {
      logSpotifySyncDiagnostic('401', endpointPath);
    }
  } else {
    consecutiveAuthFailures = 0;
  }

  // Handle 403 Access Denied
  if (res.status === 403) {
    logSpotifySyncDiagnostic('403', endpointPath);
  }

  // Handle 429 Rate Limit
  if (res.status === 429) {
    const retryAfterHeader = res.headers.get('Retry-After');
    const retryAfterSec = retryAfterHeader
      ? Math.min(Math.max(parseInt(retryAfterHeader, 10), 1), 300)
      : 5;
    rateLimitResetTime = Date.now() + retryAfterSec * 1000;

    let reason = '';
    let isQuotaExceeded = false;
    try {
      const cloned = res.clone();
      const body = await cloned.json();
      reason = body?.error?.message || body?.reason || body?.error || '';
      isQuotaExceeded = /quota|QUOTA_EXCEEDED/i.test(reason) || /quota|QUOTA_EXCEEDED/i.test(JSON.stringify(body));
    } catch {
      // Body is not JSON
    }

    last429Metadata = {
      timestamp: Date.now(),
      endpoint: endpointPath,
      retryAfterSec,
      reason,
      isQuotaExceeded,
    };

    logSpotifySyncDiagnostic(
      '429',
      endpointPath,
      `${retryAfterSec}s backoff${isQuotaExceeded ? ' (QUOTA_EXCEEDED)' : ''}`
    );
  }

  // Handle 5xx Server Failure
  if (res.status >= 500 && res.status < 600) {
    logSpotifySyncDiagnostic('5xx', endpointPath, `status ${res.status}`);
  }

  return res;
}

export interface ResolvedGenreInfo {
  canonicalGenre: string;
  subgenre: string;
}

export type ArtistGenreQuery = string | { artistName: string; trackTitle?: string };

// In-memory artist genre cache for the current browser session (normalized lowercase key -> legitimate genre)
// NEVER caches 'Unknown', empty strings, or temporary network failures.
const inMemoryArtistGenreCache = new Map<string, ResolvedGenreInfo>();

export const getInMemoryArtistGenreCache = () => inMemoryArtistGenreCache;

/**
 * Resolves artist genres via open iTunes directory fallback if Spotify returns empty genres
 */
export async function resolveArtistGenres(
  artists: ArtistGenreQuery[],
  knownGenreMap: Record<string, ResolvedGenreInfo> = {}
): Promise<Record<string, ResolvedGenreInfo>> {
  // 1. Normalize query items
  const queryItems: Array<{ artistName: string; trackTitle?: string }> = artists
    .map((item) => {
      if (typeof item === 'string') {
        return { artistName: item.trim(), trackTitle: undefined };
      }
      return { artistName: item.artistName.trim(), trackTitle: item.trackTitle?.trim() };
    })
    .filter((q) => q.artistName.length > 0);

  // 2. Seed session cache from any legitimate genres already present in knownGenreMap
  for (const [artist, info] of Object.entries(knownGenreMap)) {
    if (info && info.canonicalGenre && info.canonicalGenre !== 'Unknown') {
      inMemoryArtistGenreCache.set(artist.trim().toLowerCase(), info);
    }
  }

  // 3. Resolve known artists from in-memory session cache or curated overrides first
  const missing: Array<{ artistName: string; trackTitle?: string }> = [];

  for (const item of queryItems) {
    const key = item.artistName.toLowerCase();

    if (knownGenreMap[item.artistName] && knownGenreMap[item.artistName].canonicalGenre !== 'Unknown') {
      continue;
    }

    if (inMemoryArtistGenreCache.has(key)) {
      const cached = inMemoryArtistGenreCache.get(key)!;
      knownGenreMap[item.artistName] = cached;
      diagnoseArtistGenre(item.artistName, [], [], {
        canonicalGenre: cached.canonicalGenre,
        subgenre: cached.subgenre,
        confidence: 1.0,
        source: 'spotify',
        candidates: [cached.canonicalGenre],
        selectionReason: 'Session genre cache hit',
      }, true);
      continue;
    }

    // Check curated registry for verified catalog homonym conflation (e.g. Guinea Pigs)
    const classifiedOverride = classifyCanonicalGenre([], item.artistName, item.trackTitle);
    if (classifiedOverride.source === 'curated') {
      const info: ResolvedGenreInfo = {
        canonicalGenre: classifiedOverride.canonicalGenre,
        subgenre: classifiedOverride.subgenre,
      };
      knownGenreMap[item.artistName] = info;
      inMemoryArtistGenreCache.set(key, info);
      diagnoseArtistGenre(item.artistName, [], [], classifiedOverride, false);
      continue;
    }

    missing.push(item);
  }

  if (missing.length === 0) return knownGenreMap;

  // 4. Query fallback provider in bounded batches of 5 (respecting browser 6-socket pool limit)
  const BATCH_SIZE = 5;
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map(async ({ artistName, trackTitle }) => {
        try {
          let resolvedGenre: string | undefined;

          // Attempt 1: Specific Song-level lookup (avoids multi-artist / catalog-level homonym collisions)
          if (trackTitle && trackTitle.trim().length > 0) {
            try {
              const songQuery = `${artistName} ${trackTitle}`;
              const songRes = await fetchWithTimeout(
                `https://itunes.apple.com/search?term=${encodeURIComponent(songQuery)}&entity=song&limit=1`,
                {},
                5000
              );
              if (songRes.ok) {
                const songData = await songRes.json();
                const songItem = songData.results?.[0];
                if (songItem && songItem.primaryGenreName) {
                  resolvedGenre = songItem.primaryGenreName;
                }
              }
            } catch {
              // Fall through to artist-level search
            }
          }

          // Attempt 2: Exact artist-level lookup with name verification
          if (!resolvedGenre) {
            try {
              const res = await fetchWithTimeout(
                `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=musicArtist&limit=1`,
                {},
                5000
              );
              if (res.ok) {
                const itunesData = await res.json();
                const artistItem = itunesData.results?.[0];
                if (artistItem?.primaryGenreName) {
                  const itunesArtistName = (artistItem.artistName || '').toLowerCase();
                  const targetName = artistName.toLowerCase();
                  if (itunesArtistName.includes(targetName) || targetName.includes(itunesArtistName)) {
                    resolvedGenre = artistItem.primaryGenreName;
                  }
                }
              }
            } catch {
              // Fall through
            }
          }

          // Attempt 3: Collaboration fallback if delimiters present
          if (!resolvedGenre && / feat\.?| ft\.?| vs\.?| & |,|\//i.test(artistName)) {
            const primaryName = artistName.split(/ feat\.?| ft\.?| vs\.?| & |,|\//i)[0].trim();
            if (primaryName && primaryName.toLowerCase() !== artistName.toLowerCase()) {
              try {
                const res2 = await fetchWithTimeout(
                  `https://itunes.apple.com/search?term=${encodeURIComponent(primaryName)}&entity=musicArtist&limit=1`,
                  {},
                  5000
                );
                if (res2.ok) {
                  const itunesData2 = await res2.json();
                  resolvedGenre = itunesData2.results?.[0]?.primaryGenreName;
                }
              } catch {
                // Ignore
              }
            }
          }

          // 5. Classify the fallback genre into canonical taxonomy
          if (resolvedGenre && resolvedGenre.trim().length > 0 && resolvedGenre.toLowerCase() !== 'unknown') {
            const classified = classifyCanonicalGenre([resolvedGenre], artistName, trackTitle);
            if (classified.canonicalGenre !== 'Unknown') {
              const info: ResolvedGenreInfo = {
                canonicalGenre: classified.canonicalGenre,
                subgenre: classified.subgenre,
              };
              knownGenreMap[artistName] = info;
              inMemoryArtistGenreCache.set(artistName.toLowerCase(), info);
              diagnoseArtistGenre(artistName, [], [resolvedGenre], classified, false);
              return;
            }
          }

          // If no legitimate genre could be resolved, mark Unknown honestly
          // NEVER cache 'Unknown' permanently in inMemoryArtistGenreCache!
          knownGenreMap[artistName] = { canonicalGenre: 'Unknown', subgenre: 'Unknown' };
          diagnoseArtistGenre(artistName, [], resolvedGenre ? [resolvedGenre] : [], {
            canonicalGenre: 'Unknown',
            subgenre: 'Unknown',
            confidence: 0,
            source: 'unknown',
            candidates: [],
            selectionReason: 'No matching canonical genre found across sources',
          }, false);
        } catch {
          // Transient error: do NOT cache Unknown
          knownGenreMap[artistName] = { canonicalGenre: 'Unknown', subgenre: 'Unknown' };
        }
      })
    );
  }

  return knownGenreMap;
}

/**
 * Fetches the authenticated user profile (/v1/me) to establish stable identity and isolation.
 * Note: Never log access tokens, refresh tokens, cookies, or user credentials.
 */
export const fetchSpotifyUserProfile = async (token: string, force = false): Promise<SpotifyUserProfile | null> => {
  if (!force && inMemoryUserProfile) {
    return inMemoryUserProfile;
  }

  const res = await spotifyFetch('https://api.spotify.com/v1/me', token);
  if (!res.ok) {
    const meta = last429Metadata;
    throw new SpotifyApiError(res.status, '/v1/me', meta?.reason, meta?.retryAfterSec, meta?.reason, meta?.isQuotaExceeded);
  }
  const data: SpotifyUserProfile = await res.json();
  inMemoryUserProfile = {
    id: data.id,
    display_name: data.display_name || null,
    email: data.email,
    product: data.product,
    country: data.country,
  };
  return inMemoryUserProfile;
};

/**
 * Fetches user's current Spotify playback state
 */
export const fetchCurrentlyPlaying = async (token: string): Promise<SpotifyPlaybackState | null> => {
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

  if (!res.ok) {
    const meta = last429Metadata;
    throw new SpotifyApiError(res.status, '/v1/me/player/currently-playing', meta?.reason, meta?.retryAfterSec, meta?.reason, meta?.isQuotaExceeded);
  }
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
};

/**
 * Fetches recently played tracks incrementally since a given timestamp
 */
export const fetchRecentlyPlayedEvents = async (
  token: string,
  afterTimestamp?: number
): Promise<ListeningEvent[]> => {
  let url = 'https://api.spotify.com/v1/me/player/recently-played?limit=30';
  if (afterTimestamp && afterTimestamp > 0) {
    url += `&after=${afterTimestamp}`;
  }

  const res = await spotifyFetch(url, token);
  if (!res.ok) {
    const meta = last429Metadata;
    throw new SpotifyApiError(res.status, '/v1/me/player/recently-played', meta?.reason, meta?.retryAfterSec, meta?.reason, meta?.isQuotaExceeded);
  }

  const data: SpotifyRecentlyPlayedPayload = await res.json();
  if (!data.items || !Array.isArray(data.items)) return [];

  const queries: ArtistGenreQuery[] = data.items
    .map((item) => ({
      artistName: item.track?.artists?.[0]?.name || '',
      trackTitle: item.track?.name || '',
    }))
    .filter((q) => Boolean(q.artistName));
  const genreMap = await resolveArtistGenres(queries, {});

  return data.items.map((item) => {
    const track: SpotifyTrackItem = item.track;
    const artist = track?.artists?.[0]?.name || 'Unknown Artist';
    const playedAt = item.played_at || new Date().toISOString();
    const info = genreMap[artist] || { canonicalGenre: 'Unknown', subgenre: 'Unknown' };

    return {
      id: `${track.id || track.name}_${playedAt}`,
      trackId: track.id || `track-${track.name}`,
      trackTitle: track.name,
      artistName: artist,
      genre: info.canonicalGenre,
      subgenre: info.subgenre,
      playedAt,
      durationMs: track.duration_ms,
      source: 'spotify_recent',
      bpm: null,
    };
  });
};

/**
 * Fetches top tracks and builds initial normalized library
 */
export const fetchSpotifyTopTracks = async (token: string, force = false): Promise<RawTrackRecord[]> => {
  if (!force && inMemoryTopTracks) {
    return inMemoryTopTracks;
  }

  const response = await spotifyFetch('https://api.spotify.com/v1/me/top/tracks?limit=35&time_range=medium_term', token);
  if (!response.ok) {
    const meta = last429Metadata;
    throw new SpotifyApiError(response.status, '/v1/me/top/tracks', meta?.reason, meta?.retryAfterSec, meta?.reason, meta?.isQuotaExceeded);
  }
  const data: SpotifyTopTracksPayload = await response.json();

  let genreMap: Record<string, ResolvedGenreInfo> = {};
  const uniqueArtists = [...new Set(data.items.map((item) => item.artists[0]?.name).filter(Boolean))] as string[];

  // Seed genreMap from session cache first
  for (const name of uniqueArtists) {
    const cached = inMemoryArtistGenreCache.get(name.trim().toLowerCase());
    if (cached) {
      genreMap[name] = cached;
    }
  }

  // Only query /v1/artists for artists whose genre is NOT already known in cache
  const missingArtists = data.items.filter((item) => {
    const name = item.artists[0]?.name;
    return !name || !genreMap[name] || genreMap[name].canonicalGenre === 'Unknown';
  });

  const artistIds = [...new Set(missingArtists.map((item) => item.artists[0]?.id).filter(Boolean))].slice(0, 50);

  if (artistIds.length > 0) {
    try {
      const artistsResponse = await spotifyFetch(`https://api.spotify.com/v1/artists?ids=${artistIds.join(',')}`, token);
      if (artistsResponse.ok) {
        const artistsData: SpotifySeveralArtistsPayload = await artistsResponse.json();
        artistsData.artists?.forEach((artist) => {
          if (artist?.name && artist.genres && artist.genres.length > 0) {
            const classified = classifyCanonicalGenre(artist.genres, artist.name);
            if (classified.canonicalGenre !== 'Unknown') {
              const info: ResolvedGenreInfo = {
                canonicalGenre: classified.canonicalGenre,
                subgenre: classified.subgenre,
              };
              genreMap[artist.name] = info;
              inMemoryArtistGenreCache.set(artist.name.trim().toLowerCase(), info);
              diagnoseArtistGenre(artist.name, artist.genres, [], classified, false);
            }
          }
        });
      }
    } catch {
      // Fallback to resolveArtistGenres below
    }
  }

  const queries: ArtistGenreQuery[] = data.items.map((item) => ({
    artistName: item.artists[0]?.name || '',
    trackTitle: item.name,
  })).filter((q) => Boolean(q.artistName));

  genreMap = await resolveArtistGenres(queries, genreMap);

  const records = data.items.map((item) => {
    const artistName = item.artists[0]?.name || 'Unknown Artist';
    const info = genreMap[artistName] || { canonicalGenre: 'Unknown', subgenre: 'Unknown' };
    return {
      id: item.id,
      track: item.name,
      artist: artistName,
      genre: info.canonicalGenre,
      subgenre: info.subgenre,
      bpm: null,
      spotifyUrl: item.external_urls?.spotify,
      album: item.album?.name,
      duration: formatDurationMs(item.duration_ms),
    };
  });

  inMemoryTopTracks = records;
  return records;
};

function formatDurationMs(ms?: number): string {
  if (!ms) return '3:45';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
