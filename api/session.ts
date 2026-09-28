import crypto from 'crypto';
import type { Request, Response } from 'express';

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

/**
 * Encrypts session payload into a tamper-proof base64url string using AES-256-GCM.
 */
export function encryptSession(data: SessionPayload): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const plaintext = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

/**
 * Decrypts and verifies the session payload from the encrypted cookie string.
 */
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

/**
 * Sets the encrypted session token in an HttpOnly, SameSite, Secure cookie.
 */
export function setSessionCookie(req: Request, res: Response, refreshToken: string) {
  const token = encryptSession({
    refreshToken,
    createdAt: Date.now()
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction || Boolean(isHttps),
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });
}

/**
 * Clears the session cookie on logout.
 */
export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    path: '/'
  });
}
