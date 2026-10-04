import type { SpotifyConnectionState } from '../types';

/**
 * Custom error class representing Spotify API errors with HTTP status code and endpoint path.
 * Guarantees that internal auth tokens, headers, and secrets are never exposed in messages.
 */
export class SpotifyApiError extends Error {
  readonly status: number;
  readonly endpoint: string;
  readonly classification: SpotifyConnectionState;
  readonly retryAfterSeconds?: number;
  readonly reason?: string;
  readonly isQuotaExceeded?: boolean;

  constructor(
    status: number,
    endpoint: string,
    message?: string,
    retryAfterSeconds?: number,
    reason?: string,
    isQuotaExceeded?: boolean
  ) {
    const defaultMsg = getSpotifyErrorMessage(status, isQuotaExceeded);
    super(message || defaultMsg);
    this.name = 'SpotifyApiError';
    this.status = status;
    this.endpoint = sanitizeEndpoint(endpoint);
    this.classification = classifySpotifyStatus(status);
    this.retryAfterSeconds = retryAfterSeconds;
    this.reason = reason;
    this.isQuotaExceeded = isQuotaExceeded;
  }
}

/**
 * Sanitizes URLs to strip query parameters, hash fragments, and prevent credential leakage.
 */
export function sanitizeEndpoint(urlOrPath: string): string {
  if (!urlOrPath) return '';
  try {
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
      const parsed = new URL(urlOrPath);
      return parsed.pathname;
    }
  } catch {
    // Fall back to simple split
  }
  return urlOrPath.split('?')[0].split('#')[0];
}

/**
 * Classifies an HTTP status code or network failure into canonical SpotifyConnectionState.
 */
export function classifySpotifyStatus(status: number): SpotifyConnectionState {
  switch (status) {
    case 401:
      return 'unauthorized';
    case 403:
      return 'access_denied';
    case 429:
      return 'rate_limited';
    case 0:
      return 'network_error';
    default:
      if (status >= 500 && status < 600) {
        return 'error';
      }
      return 'error';
  }
}

/**
 * Returns human-friendly, non-technical explanation messages for errors.
 * Never exposes raw upstream JSON bodies or token details to the user.
 */
export function getSpotifyErrorMessage(status: number, isQuotaExceeded = false): string {
  switch (status) {
    case 401:
      return 'Spotify session expired or unauthorized. Please reconnect.';
    case 403:
      return "Your Spotify account was authenticated, but Spotify isn't currently allowing this account to access this Development Mode app. Ask the app owner to grant access, or try again later.";
    case 429:
      return isQuotaExceeded
        ? 'Spotify app quota reached (QUOTA_EXCEEDED). Spotify Developer mode quota for this application has been exceeded. Please try again later.'
        : 'Spotify rate limit exceeded. Please wait a moment and try again.';
    case 0:
      return 'Network connection issue communicating with Spotify.';
    default:
      if (status >= 500 && status < 600) {
        return 'Spotify service is currently unavailable. Please try again later.';
      }
      return 'Unable to synchronize with Spotify.';
  }
}

/**
 * Canonical header status label mapping per requirement F.
 */
export function getSpotifyStatusLabel(state: SpotifyConnectionState, isLive = false): string {
  if (isLive) return 'Spotify · Live';

  switch (state) {
    case 'connecting':
      return 'Spotify · Connecting';
    case 'syncing':
      return 'Spotify · Syncing';
    case 'live':
      return 'Spotify · Live';
    case 'updated_recently':
    case 'synced':
      return 'Spotify · Synced';
    case 'access_denied':
      return 'Spotify · Access unavailable';
    case 'unauthorized':
      return 'Spotify · Reconnect required';
    case 'rate_limited':
      return 'Spotify · Rate limited';
    case 'network_error':
    case 'offline':
      return 'Spotify · Offline';
    case 'empty_library':
      return 'Spotify · Connected';
    case 'disconnected':
      return 'Spotify · Offline';
    case 'error':
    default:
      return 'Spotify · Sync error';
  }
}

/**
 * Diagnostic logger providing safe development observability without credential leakage.
 * Satisfies Requirement H:
 * [SpotifySync] 403 access denied
 * [SpotifySync] 401 unauthorized
 * [SpotifySync] 429 rate limited
 * [SpotifySync] network error
 * [SpotifySync] successful sync
 */
export function logSpotifySyncDiagnostic(
  category: '403' | '401' | '429' | 'network' | '5xx' | 'error' | 'success',
  endpoint?: string,
  extra?: string
): void {
  const cleanEndpoint = endpoint ? sanitizeEndpoint(endpoint) : '';
  const endpointSuffix = cleanEndpoint ? ` for ${cleanEndpoint}` : '';

  switch (category) {
    case '403':
      console.warn(`[SpotifySync] 403 access denied${endpointSuffix}`);
      break;
    case '401':
      console.warn(`[SpotifySync] 401 unauthorized${endpointSuffix}`);
      break;
    case '429':
      console.warn(`[SpotifySync] 429 rate limited${endpointSuffix}${extra ? ` (${extra})` : ''}`);
      break;
    case 'network':
      console.warn(`[SpotifySync] network error${endpointSuffix}${extra ? `: ${extra}` : ''}`);
      break;
    case 'success':
      console.log(`[SpotifySync] successful sync${endpointSuffix}`);
      break;
    case '5xx':
      console.warn(`[SpotifySync] 5xx server error${endpointSuffix}${extra ? `: ${extra}` : ''}`);
      break;
    default:
      console.warn(`[SpotifySync] sync error${endpointSuffix}${extra ? `: ${extra}` : ''}`);
      break;
  }
}
