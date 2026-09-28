import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import {
  COOKIE_NAME,
  setSessionCookie,
  clearSessionCookie,
  decryptSession,
} from './session';

export const app = express();

// Reverse proxy configuration for rate limiting & secure cookies behind Vercel/proxies
app.set('trust proxy', 1);

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);

// Explicit CORS Origins Configuration (Separate Production and Localhost)
const DEFAULT_ALLOWED_ORIGINS = [
  'https://music-taste-graph.vercel.app',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://localhost:3000',
  'http://127.0.0.1:3001',
  'http://localhost:3001',
];

const envAllowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

const ALLOWED_ORIGIN_SET = new Set([...DEFAULT_ALLOWED_ORIGINS, ...envAllowedOrigins]);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as same-origin requests, curl, or mobile clients)
      if (!origin) {
        return callback(null, true);
      }
      if (ALLOWED_ORIGIN_SET.has(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Strict Rate Limiting for Auth endpoints (30 requests per 15 minutes per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

// General API Rate Limiting (100 requests per 15 minutes per IP)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use('/api/auth/', authLimiter);
app.use('/api/', generalLimiter);

// Cookie and JSON Body Parsers
app.use(cookieParser());
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));

// Allowlisted Spotify Redirect URIs
const DEFAULT_ALLOWED_REDIRECT_URIS = [
  'https://music-taste-graph.vercel.app/',
  'http://127.0.0.1:5173/',
  'http://localhost:5173/',
];

const envRedirectUris = [
  ...(process.env.SPOTIFY_REDIRECT_URI ? [process.env.SPOTIFY_REDIRECT_URI.trim()] : []),
  ...(process.env.ALLOWED_REDIRECT_URIS
    ? process.env.ALLOWED_REDIRECT_URIS.split(',').map((u) => u.trim()).filter(Boolean)
    : []),
];

const ALLOWED_REDIRECT_URIS = new Set([...DEFAULT_ALLOWED_REDIRECT_URIS, ...envRedirectUris]);

function getSpotifyClientId(): string {
  const clientId = process.env.SPOTIFY_CLIENT_ID || process.env.VITE_SPOTIFY_CLIENT_ID;
  if (!clientId) {
    throw new Error('SPOTIFY_CLIENT_ID is not configured in server environment');
  }
  return clientId;
}

function sendSanitizedError(res: Response, status: number, clientMessage: string, internalError: unknown) {
  const correlationId = crypto.randomUUID();
  const detail = internalError instanceof Error ? internalError.message : String(internalError);
  console.error(`[Correlation ID: ${correlationId}] Internal error: ${detail}`);
  res.status(status).json({
    error: clientMessage,
    correlationId,
  });
}

// Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'music-taste-graph-backend',
  });
});

// Check Session Authentication Status
app.get('/api/auth/spotify/session', (req: Request, res: Response) => {
  const sessionCookie = req.cookies?.[COOKIE_NAME];
  const session = sessionCookie ? decryptSession(sessionCookie) : null;
  res.status(200).json({
    authenticated: Boolean(session?.refreshToken),
  });
});

// Spotify PKCE Token Exchange Endpoint
app.post('/api/auth/spotify/token', async (req: Request, res: Response) => {
  const { code, code_verifier, redirect_uri } = req.body;

  // Runtime Schema Validation (F-10)
  if (
    typeof code !== 'string' ||
    code.length < 10 ||
    code.length > 1024 ||
    typeof code_verifier !== 'string' ||
    code_verifier.length < 43 ||
    code_verifier.length > 128 ||
    !/^[A-Za-z0-9\-._~]+$/.test(code_verifier) ||
    typeof redirect_uri !== 'string' ||
    redirect_uri.length > 512
  ) {
    res.status(400).json({
      error: 'Invalid request body: code (10-1024 chars), code_verifier (43-128 PKCE chars), and valid redirect_uri string required.',
    });
    return;
  }

  // Redirect URI Allowlist Enforcement (F-04)
  if (!ALLOWED_REDIRECT_URIS.has(redirect_uri)) {
    res.status(400).json({
      error: 'The provided redirect_uri is not allowlisted on this server.',
    });
    return;
  }

  let clientId: string;
  try {
    clientId = getSpotifyClientId();
  } catch (err) {
    sendSanitizedError(res, 500, 'Server authentication configuration error', err);
    return;
  }

  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri,
      client_id: clientId,
      code_verifier,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (clientSecret) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    }

    const spotifyRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers,
      body: params.toString(),
    });

    const data = await spotifyRes.json();

    if (!spotifyRes.ok) {
      const correlationId = crypto.randomUUID();
      console.error(`[Correlation ID: ${correlationId}] Spotify token exchange rejected: status ${spotifyRes.status}`);
      res.status(spotifyRes.status >= 500 ? 502 : 400).json({
        error: 'Spotify authorization failed',
        correlationId,
      });
      return;
    }

    // Secure Refresh Token: store in encrypted HttpOnly cookie; do NOT expose to browser JS (F-01)
    if (data.refresh_token) {
      setSessionCookie(req, res, data.refresh_token);
    }

    // Return only short-lived access token and expiry to client
    res.status(200).json({
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      scope: data.scope,
    });
  } catch (err: unknown) {
    sendSanitizedError(res, 500, 'Failed to complete authentication exchange with Spotify', err);
  }
});

// Spotify Token Refresh Endpoint (F-01, F-03)
app.post('/api/auth/spotify/refresh', async (req: Request, res: Response) => {
  // Reject arbitrary bearer tokens from request body; strictly use the session cookie
  const sessionCookie = req.cookies?.[COOKIE_NAME];
  const session = sessionCookie ? decryptSession(sessionCookie) : null;

  if (!session || !session.refreshToken) {
    res.status(401).json({
      error: 'No active session or session expired. Please connect Spotify.',
    });
    return;
  }

  let clientId: string;
  try {
    clientId = getSpotifyClientId();
  } catch (err) {
    sendSanitizedError(res, 500, 'Server authentication configuration error', err);
    return;
  }

  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  try {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
      client_id: clientId,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (clientSecret) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    }

    const spotifyRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers,
      body: params.toString(),
    });

    const data = await spotifyRes.json();

    if (!spotifyRes.ok) {
      const correlationId = crypto.randomUUID();
      console.error(`[Correlation ID: ${correlationId}] Spotify token refresh rejected: status ${spotifyRes.status}`);
      if (spotifyRes.status === 400 || spotifyRes.status === 401) {
        clearSessionCookie(res);
      }
      res.status(spotifyRes.status >= 500 ? 502 : 401).json({
        error: 'Session refresh failed. Please reconnect Spotify.',
        correlationId,
      });
      return;
    }

    // If Spotify rotated the refresh token, update session cookie
    if (data.refresh_token) {
      setSessionCookie(req, res, data.refresh_token);
    }

    // Return new access token (refresh token remains private on server)
    res.status(200).json({
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      scope: data.scope,
    });
  } catch (err: unknown) {
    sendSanitizedError(res, 500, 'Failed to refresh token with Spotify', err);
  }
});

// Spotify Logout Endpoint
app.post('/api/auth/spotify/logout', (_req: Request, res: Response) => {
  clearSessionCookie(res);
  res.status(200).json({
    status: 'ok',
    message: 'Spotify session cleared successfully.',
  });
});

// Global Error handling middleware (F-05)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const correlationId = crypto.randomUUID();
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  console.error(`[Correlation ID: ${correlationId}] Express Unhandled Error:`, message);
  res.status(500).json({
    error: 'Internal server error',
    correlationId,
  });
});

export default app;
