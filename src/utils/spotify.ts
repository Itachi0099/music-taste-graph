import type { RawTrackRecord } from '../types';

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '663e5f2a2950473ba037426e5343b8df'; 
const getRedirectUri = (): string => {
  // If running in browser, ALWAYS dynamically use current origin so Vercel and local both work identically
  if (typeof window !== 'undefined' && window.location.origin) {
    const origin = window.location.origin.replace(/\/$/, '');
    return origin;
  }
  return 'https://music-taste-graph.vercel.app';
};

const SCOPES = ['user-top-read'];

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

  localStorage.setItem('spotify_code_verifier', codeVerifier);
  sessionStorage.setItem('spotify_code_verifier', codeVerifier);
  localStorage.setItem('spotify_redirect_uri', redirectUri);
  sessionStorage.setItem('spotify_redirect_uri', redirectUri);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES.join(' '),
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    show_dialog: 'true',
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
};

let tokenExchangePromise: Promise<string | null> | null = null;

export const getSpotifyToken = async (): Promise<string | null> => {
  // Check URL hash (legacy token fallback)
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');
    if (token) {
      window.history.replaceState(null, '', window.location.pathname);
      sessionStorage.setItem('spotify_access_token', token);
      return token;
    }
  }

  // If a token exchange is currently in flight, return the active promise
  if (tokenExchangePromise) {
    return tokenExchangePromise;
  }

  // Check URL query parameters (Authorization Code with PKCE)
  const searchParams = new URLSearchParams(window.location.search);
  const error = searchParams.get('error');
  if (error) {
    window.history.replaceState(null, '', window.location.pathname);
    throw new Error(`Spotify authorization error: ${error}`);
  }

  const code = searchParams.get('code');
  if (!code) {
    return sessionStorage.getItem('spotify_access_token');
  }

  // IMMEDIATELY remove code from URL to prevent React StrictMode double-execution
  // from attempting to exchange the single-use authorization code twice
  window.history.replaceState(null, '', window.location.pathname);

  const verifier = localStorage.getItem('spotify_code_verifier') || sessionStorage.getItem('spotify_code_verifier');
  if (!verifier) {
    const cachedToken = sessionStorage.getItem('spotify_access_token');
    if (cachedToken) return cachedToken;
    throw new Error('Spotify code verifier not found. Please try syncing again.');
  }

  const redirectUri =
    localStorage.getItem('spotify_redirect_uri') ||
    sessionStorage.getItem('spotify_redirect_uri') ||
    getRedirectUri();

  tokenExchangePromise = (async () => {
    try {
      // First attempt to exchange via our Next.js / Express backend API
      const backendResponse = await fetch('/api/auth/spotify/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          code_verifier: verifier,
          redirect_uri: redirectUri
        })
      });

      let data;
      if (backendResponse.ok) {
        data = await backendResponse.json();
      } else {
        // Fallback directly to Spotify accounts endpoint if backend route is unavailable
        const body = new URLSearchParams({
          client_id: CLIENT_ID,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          code_verifier: verifier,
        });

        const fallbackResponse = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        });

        if (!fallbackResponse.ok) {
          const errorData = await fallbackResponse.json().catch(() => ({}));
          throw new Error(errorData.error_description || errorData.error || 'Failed to exchange authorization code for token');
        }
        data = await fallbackResponse.json();
      }

      const accessToken = data.access_token as string;
      sessionStorage.setItem('spotify_access_token', accessToken);
      if (data.refresh_token) {
        sessionStorage.setItem('spotify_refresh_token', data.refresh_token);
      }
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

export const fetchSpotifyTopTracks = async (token: string): Promise<RawTrackRecord[]> => {
  // Fetch top tracks
  const response = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=30&time_range=medium_term', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to fetch Spotify tracks');
  const data = await response.json();
  
  let genreMap: Record<string, string> = {};
  const artistIds = [...new Set(data.items.map((item: any) => item.artists[0]?.id).filter(Boolean))].slice(0, 50);

  // Attempt Spotify artists endpoint (note: Spotify returns 403 on Development Mode apps since Nov 2024)
  if (artistIds.length > 0) {
    try {
      const artistsResponse = await fetch(`https://api.spotify.com/v1/artists?ids=${artistIds.join(',')}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (artistsResponse.ok) {
        const artistsData = await artistsResponse.json();
        artistsData.artists?.forEach((artist: any) => {
          if (artist?.name && artist.genres?.length > 0) {
            genreMap[artist.name] = artist.genres[0];
          }
        });
      }
    } catch {
      // Ignore Spotify restricted endpoint
    }
  }

  // Fallback: If Spotify catalog was blocked (403), lookup genres via open iTunes search API
  const uniqueArtists = [...new Set(data.items.map((item: any) => item.artists[0]?.name).filter(Boolean))] as string[];
  const missingArtists = uniqueArtists.filter((artist) => !genreMap[artist] || genreMap[artist] === 'Unknown');

  if (missingArtists.length > 0) {
    await Promise.allSettled(
      missingArtists.map(async (artistName) => {
        try {
          const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=musicArtist&limit=1`);
          if (res.ok) {
            const itunesData = await res.json();
            const genre = itunesData.results?.[0]?.primaryGenreName;
            if (genre) {
              genreMap[artistName] = genre;
            }
          }
        } catch {
          // Ignore network errors
        }
      })
    );
  }

  // Also fetch audio features for BPM (tempo) - gracefully handle 403 if restricted
  const trackIds = data.items.map((item: any) => item.id).filter(Boolean);
  let bpmMap: Record<string, number> = {};
  if (trackIds.length > 0) {
    try {
      const featuresResponse = await fetch(`https://api.spotify.com/v1/audio-features?ids=${trackIds.join(',')}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (featuresResponse.ok) {
        const featuresData = await featuresResponse.json();
        featuresData.audio_features?.forEach((feature: any) => {
          if (feature) bpmMap[feature.id] = Math.round(feature.tempo);
        });
      }
    } catch {
      // Ignore 403 on restricted audio-features
    }
  }

  // Map to our RawTrackRecord format
  return data.items.map((item: any) => ({
    track: item.name,
    artist: item.artists[0]?.name || 'Unknown Artist',
    genre: genreMap[item.artists[0]?.name] || 'Pop',
    bpm: bpmMap[item.id] || null
  }));
};
