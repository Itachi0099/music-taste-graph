import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';

// ============================================================
// SESSION SECURITY & ENCRYPTION (F-01, F-03)
// ============================================================
export const COOKIE_NAME = 'cmu_spotify_session';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET || 'celestial_music_universe_secure_session_secret_key_2026';
  return crypto.createHash('sha256').update(secret).digest();
}

export interface SessionPayload {
  refreshToken: string;
  createdAt: number;
}

export function encryptSession(data: SessionPayload): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const plaintext = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decryptSession(cookieValue: string): SessionPayload | null {
  try {
    const raw = Buffer.from(cookieValue, 'base64url');
    if (raw.length < IV_LENGTH + TAG_LENGTH + 1) {
      return null;
    }

    const iv = raw.subarray(0, IV_LENGTH);
    const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = raw.subarray(IV_LENGTH + TAG_LENGTH);

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const parsed = JSON.parse(decrypted.toString('utf8'));
    if (!parsed || typeof parsed.refreshToken !== 'string') {
      return null;
    }
    return parsed as SessionPayload;
  } catch {
    return null;
  }
}

export function setSessionCookie(req: Request, res: Response, refreshToken: string) {
  const token = encryptSession({
    refreshToken,
    createdAt: Date.now(),
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction || Boolean(isHttps),
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    path: '/',
  });
}

// ============================================================
// CANONICAL EXPRESS APPLICATION (F-07)
// ============================================================
export const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);

// Explicit CORS Origins Configuration (F-02)
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

// Rate Limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use('/api/auth/', authLimiter);
app.use('/api/', generalLimiter);

app.use(cookieParser());
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));

// Allowlisted Spotify Redirect URIs (F-04)
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

    if (data.refresh_token) {
      setSessionCookie(req, res, data.refresh_token);
    }

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

// Vercel Serverless Function entry point
export default function handler(req: Request, res: Response) {
  return app(req, res);
}
