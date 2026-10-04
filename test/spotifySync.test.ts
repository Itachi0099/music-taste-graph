import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  SpotifyApiError,
  classifySpotifyStatus,
  getSpotifyStatusLabel,
  sanitizeEndpoint,
  logSpotifySyncDiagnostic,
} from '../src/utils/spotifyError.js';
import {
  fetchSpotifyUserProfile,
  fetchSpotifyTopTracks,
  fetchCurrentlyPlaying,
  fetchRecentlyPlayedEvents,
  resetSpotifyRateLimitState,
} from '../src/utils/spotify.js';
import { normalizeMusicRecords } from '../src/utils/normalizer.js';
import type { RawTrackRecord, SpotifyStatusInfo } from '../src/types/index.js';

describe('Spotify Error Classification & Diagnostics', () => {
  test('correctly classifies HTTP status codes', () => {
    assert.equal(classifySpotifyStatus(403), 'access_denied');
    assert.equal(classifySpotifyStatus(401), 'unauthorized');
    assert.equal(classifySpotifyStatus(429), 'rate_limited');
    assert.equal(classifySpotifyStatus(0), 'network_error');
    assert.equal(classifySpotifyStatus(500), 'error');
    assert.equal(classifySpotifyStatus(503), 'error');
  });

  test('generates canonical status labels according to UX specification', () => {
    assert.equal(getSpotifyStatusLabel('connecting'), 'Spotify · Connecting');
    assert.equal(getSpotifyStatusLabel('syncing'), 'Spotify · Syncing');
    assert.equal(getSpotifyStatusLabel('live'), 'Spotify · Live');
    assert.equal(getSpotifyStatusLabel('updated_recently'), 'Spotify · Synced');
    assert.equal(getSpotifyStatusLabel('synced'), 'Spotify · Synced');
    assert.equal(getSpotifyStatusLabel('access_denied'), 'Spotify · Access unavailable');
    assert.equal(getSpotifyStatusLabel('unauthorized'), 'Spotify · Reconnect required');
    assert.equal(getSpotifyStatusLabel('rate_limited'), 'Spotify · Rate limited');
    assert.equal(getSpotifyStatusLabel('offline'), 'Spotify · Offline');
    assert.equal(getSpotifyStatusLabel('network_error'), 'Spotify · Offline');
    assert.equal(getSpotifyStatusLabel('empty_library'), 'Spotify · Connected');
  });

  test('sanitizes URL endpoints to strip query parameters, tokens, and credentials', () => {
    const rawUrl = 'https://api.spotify.com/v1/me/top/tracks?limit=35&time_range=medium_term#secret';
    assert.equal(sanitizeEndpoint(rawUrl), '/v1/me/top/tracks');
    assert.equal(sanitizeEndpoint('/v1/me?token=sensitive_token_123'), '/v1/me');
  });

  test('SpotifyApiError carries classification, status, and sanitized endpoint', () => {
    const err = new SpotifyApiError(403, 'https://api.spotify.com/v1/me?token=xyz');
    assert.equal(err.status, 403);
    assert.equal(err.classification, 'access_denied');
    assert.equal(err.endpoint, '/v1/me');
    assert.match(err.message, /Spotify isn't currently allowing this account to access this Development Mode app/);
    assert.doesNotMatch(err.message, /token|secret|header/i);
  });

  test('diagnostic logging outputs endpoint without logging tokens or auth headers', () => {
    const loggedMessages: string[] = [];
    const origWarn = console.warn;
    const origLog = console.log;

    console.warn = (...args: unknown[]) => loggedMessages.push(args.join(' '));
    console.log = (...args: unknown[]) => loggedMessages.push(args.join(' '));

    try {
      logSpotifySyncDiagnostic('403', 'https://api.spotify.com/v1/me?access_token=secret123');
      logSpotifySyncDiagnostic('401', 'https://api.spotify.com/v1/me/player');
      logSpotifySyncDiagnostic('429', '/v1/me/top/tracks', '30s backoff');
      logSpotifySyncDiagnostic('network', '/v1/me', 'Failed to fetch');
      logSpotifySyncDiagnostic('success', '/v1/me/top/tracks');

      assert.ok(loggedMessages.some((msg) => msg.includes('[SpotifySync] 403 access denied for /v1/me')));
      assert.ok(loggedMessages.some((msg) => msg.includes('[SpotifySync] 401 unauthorized for /v1/me/player')));
      assert.ok(loggedMessages.some((msg) => msg.includes('[SpotifySync] 429 rate limited for /v1/me/top/tracks (30s backoff)')));
      assert.ok(loggedMessages.some((msg) => msg.includes('[SpotifySync] network error for /v1/me: Failed to fetch')));
      assert.ok(loggedMessages.some((msg) => msg.includes('[SpotifySync] successful sync for /v1/me/top/tracks')));

      // Assert no secret tokens are present
      assert.ok(!loggedMessages.some((msg) => msg.includes('secret123')));
    } finally {
      console.warn = origWarn;
      console.log = origLog;
    }
  });
});

describe('Spotify API Methods Error Propagation', () => {
  const origFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = origFetch;
  });

  test('fetchSpotifyUserProfile throws SpotifyApiError with 403 on Development Mode restriction', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { status: 403, message: 'User not registered in Developer Dashboard' } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });

    await assert.rejects(
      async () => fetchSpotifyUserProfile('mock-token'),
      (err: unknown) => {
        assert.ok(err instanceof SpotifyApiError);
        assert.equal(err.status, 403);
        assert.equal(err.classification, 'access_denied');
        assert.equal(err.endpoint, '/v1/me');
        return true;
      }
    );
  });

  test('fetchSpotifyTopTracks throws SpotifyApiError with 403 on Development Mode restriction', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { status: 403, message: 'Forbidden' } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });

    await assert.rejects(
      async () => fetchSpotifyTopTracks('mock-token'),
      (err: unknown) => {
        assert.ok(err instanceof SpotifyApiError);
        assert.equal(err.status, 403);
        assert.equal(err.classification, 'access_denied');
        assert.equal(err.endpoint, '/v1/me/top/tracks');
        return true;
      }
    );
  });

  test('fetchCurrentlyPlaying throws SpotifyApiError on 401', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { status: 401, message: 'The access token expired' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });

    await assert.rejects(
      async () => fetchCurrentlyPlaying('mock-token'),
      (err: unknown) => {
        assert.ok(err instanceof SpotifyApiError);
        assert.equal(err.status, 401);
        assert.equal(err.classification, 'unauthorized');
        return true;
      }
    );
  });

  test('fetchRecentlyPlayedEvents throws SpotifyApiError on 403', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { status: 403, message: 'Forbidden' } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });

    await assert.rejects(
      async () => fetchRecentlyPlayedEvents('mock-token'),
      (err: unknown) => {
        assert.ok(err instanceof SpotifyApiError);
        assert.equal(err.status, 403);
        assert.equal(err.classification, 'access_denied');
        return true;
      }
    );
  });
});

describe('Requirement J Regression Test Scenarios', () => {
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    resetSpotifyRateLimitState();
  });

  afterEach(() => {
    resetSpotifyRateLimitState();
    globalThis.fetch = origFetch;
  });

  // Mock app harness simulating the state machine of App.tsx
  class AppSpotifyStateMachine {
    records: RawTrackRecord[] = [];
    preset = 'electronic';
    spotifyStatus: SpotifyStatusInfo = {
      state: 'disconnected',
      lastSyncAt: null,
      label: 'Spotify · Offline',
    };
    pollingActive = false;

    async sync(token: string) {
      this.preset = 'spotify';
      this.records = [];
      this.pollingActive = true;
      this.spotifyStatus = {
        state: 'syncing',
        lastSyncAt: null,
        label: 'Spotify · Syncing',
      };

      try {
        let profile = null;
        try {
          profile = await fetchSpotifyUserProfile(token);
        } catch (err) {
          if (err instanceof SpotifyApiError && (err.status === 403 || err.status === 401)) {
            throw err;
          }
        }

        if (profile) {
          this.spotifyStatus.userId = profile.id;
          this.spotifyStatus.userName = profile.display_name || undefined;
        }

        const topTracks = await fetchSpotifyTopTracks(token);

        if (topTracks.length === 0) {
          this.records = [];
          this.spotifyStatus.state = 'empty_library';
          this.spotifyStatus.lastSyncAt = Date.now();
          this.spotifyStatus.label = 'Spotify · Connected';
        } else {
          const db = normalizeMusicRecords(topTracks, 'spotify');
          this.records = db.rawRecords;
          this.spotifyStatus.state = 'updated_recently';
          this.spotifyStatus.lastSyncAt = Date.now();
          this.spotifyStatus.label = 'Spotify · Synced';
        }
      } catch (err) {
        this.pollingActive = false;
        this.records = [];

        if (err instanceof SpotifyApiError) {
          if (err.status === 403) {
            this.spotifyStatus = {
              ...this.spotifyStatus,
              state: 'access_denied',
              lastSyncAt: null,
              label: 'Spotify · Access unavailable',
              errorMessage: "Your Spotify account was authenticated, but Spotify isn't currently allowing this account to access this Development Mode app. Ask the app owner to grant access, or try again later.",
            };
            return;
          }
          if (err.status === 401) {
            this.spotifyStatus = {
              ...this.spotifyStatus,
              state: 'unauthorized',
              lastSyncAt: null,
              label: 'Spotify · Reconnect required',
              errorMessage: 'Spotify session expired. Please reconnect.',
            };
            return;
          }
          if (err.status === 429) {
            this.spotifyStatus = {
              ...this.spotifyStatus,
              state: 'rate_limited',
              lastSyncAt: null,
              label: 'Spotify · Rate limited',
            };
            return;
          }
          if (err.classification === 'network_error') {
            this.spotifyStatus = {
              ...this.spotifyStatus,
              state: 'offline',
              lastSyncAt: null,
              label: 'Spotify · Offline',
            };
            return;
          }
        }

        this.spotifyStatus = {
          ...this.spotifyStatus,
          state: 'error',
          lastSyncAt: null,
          label: 'Spotify · Sync error',
        };
      }
    }

    disconnect() {
      this.pollingActive = false;
      this.spotifyStatus = {
        state: 'disconnected',
        lastSyncAt: null,
        label: 'Spotify · Offline',
        userId: undefined,
        userName: undefined,
      };
      this.preset = 'electronic';
      this.records = [{ track: 'Demo Synth', artist: 'Bicep', genre: 'Electronic' }];
    }
  }

  test('Scenario 1: Successful Spotify user (/me=200, top tracks=200 -> normal universe)', async () => {
    globalThis.fetch = async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes('/v1/me/top/tracks')) {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: 'track-1',
                name: 'Solar Drift',
                artists: [{ id: 'artist-1', name: 'Astral Project' }],
                duration_ms: 240000,
                external_urls: { spotify: 'https://open.spotify.com/track/1' },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (u.includes('/v1/me')) {
        return new Response(
          JSON.stringify({ id: 'user_123', display_name: 'Astral Walker' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ artists: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const app = new AppSpotifyStateMachine();
    await app.sync('valid-token');

    assert.equal(app.preset, 'spotify');
    assert.equal(app.spotifyStatus.state, 'updated_recently');
    assert.equal(app.spotifyStatus.label, 'Spotify · Synced');
    assert.equal(app.spotifyStatus.userId, 'user_123');
    assert.equal(app.spotifyStatus.userName, 'Astral Walker');
    assert.ok(app.spotifyStatus.lastSyncAt! > 0);
    assert.equal(app.records.length, 1);
    assert.equal(app.records[0].track, 'Solar Drift');
    assert.equal(app.pollingActive, true);
  });

  test('Scenario 2: Non-allowlisted Development Mode user (/me or top tracks=403 -> access_denied, 0 records, no demo records, no Synced, polling stops)', async () => {
    globalThis.fetch = async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes('/v1/me/top/tracks') || u.includes('/v1/me')) {
        return new Response(
          JSON.stringify({ error: { status: 403, message: 'User not registered in Developer Dashboard' } }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('', { status: 404 });
    };

    const app = new AppSpotifyStateMachine();
    await app.sync('dev-mode-unlisted-token');

    assert.equal(app.preset, 'spotify');
    assert.equal(app.spotifyStatus.state, 'access_denied');
    assert.equal(app.spotifyStatus.label, 'Spotify · Access unavailable');
    assert.notEqual(app.spotifyStatus.label, 'Spotify · Synced');
    assert.equal(app.spotifyStatus.lastSyncAt, null, 'lastSyncAt must NOT be set on 403');
    assert.equal(app.records.length, 0, 'Zero user records must be retained');
    assert.equal(app.pollingActive, false, 'Polling must stop on 403');
    assert.ok(app.spotifyStatus.errorMessage?.includes('Development Mode'));
  });

  test('Scenario 3: Expired/invalid token (401 -> unauthorized / reconnect required)', async () => {
    globalThis.fetch = async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes('/api/auth/spotify/refresh')) {
        return new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 });
      }
      return new Response(
        JSON.stringify({ error: { status: 401, message: 'The access token expired' } }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const app = new AppSpotifyStateMachine();
    await app.sync('expired-token');

    assert.equal(app.spotifyStatus.state, 'unauthorized');
    assert.equal(app.spotifyStatus.label, 'Spotify · Reconnect required');
    assert.equal(app.records.length, 0);
    assert.equal(app.pollingActive, false);
  });

  test('Scenario 4: Rate limit (429 -> rate_limited)', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Retry-After': '10', 'Content-Type': 'application/json' },
      });

    const app = new AppSpotifyStateMachine();
    await app.sync('rate-limited-token');

    assert.equal(app.spotifyStatus.state, 'rate_limited');
    assert.equal(app.spotifyStatus.label, 'Spotify · Rate limited');
    assert.equal(app.records.length, 0);
  });

  test('Scenario 5: Network failure (-> offline/network_error)', async () => {
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch (DNS resolution failed)');
    };

    const app = new AppSpotifyStateMachine();
    await app.sync('token-during-outage');

    assert.equal(app.spotifyStatus.state, 'offline');
    assert.equal(app.spotifyStatus.label, 'Spotify · Offline');
    assert.equal(app.records.length, 0);
    assert.equal(app.pollingActive, false);
  });

  test('Scenario 6: Legitimately empty Spotify result (200 with 0 tracks -> empty_library, NOT access_denied)', async () => {
    globalThis.fetch = async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes('/v1/me/top/tracks')) {
        return new Response(
          JSON.stringify({ items: [] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (u.includes('/v1/me')) {
        return new Response(
          JSON.stringify({ id: 'brand_new_user', display_name: 'Newbie' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ artists: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const app = new AppSpotifyStateMachine();
    await app.sync('brand-new-user-token');

    assert.equal(app.spotifyStatus.state, 'empty_library');
    assert.equal(app.spotifyStatus.label, 'Spotify · Connected');
    assert.notEqual(app.spotifyStatus.state, 'access_denied');
    assert.equal(app.records.length, 0);
    assert.ok(app.spotifyStatus.lastSyncAt! > 0, 'Successful sync sets timestamp even if library is empty');
  });

  test('Scenario 7: User A -> Disconnect -> failed User B connection: zero leaked records', async () => {
    // 1. User A connects successfully
    globalThis.fetch = async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes('/v1/me/top/tracks')) {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: 'track-user-a',
                name: 'User A Secret Jam',
                artists: [{ id: 'artist-a', name: 'Private Artist A' }],
                duration_ms: 180000,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (u.includes('/v1/me')) {
        return new Response(
          JSON.stringify({ id: 'user_a', display_name: 'User A' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ artists: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const app = new AppSpotifyStateMachine();
    await app.sync('token-user-a');
    assert.equal(app.records.length, 1);
    assert.equal(app.records[0].artist, 'Private Artist A');

    // 2. User A disconnects
    app.disconnect();
    assert.equal(app.spotifyStatus.userId, undefined);
    assert.equal(app.spotifyStatus.userName, undefined);
    // Verified user records are wiped; default preset loaded
    assert.equal(app.preset, 'electronic');

    // 3. User B connects but Spotify returns 403 (Development Mode unlisted)
    globalThis.fetch = async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes('/v1/me')) {
        return new Response(
          JSON.stringify({ error: { status: 403, message: 'Development Mode access denied' } }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('', { status: 403 });
    };

    await app.sync('token-user-b');

    // Confirm strict multi-user isolation
    assert.equal(app.preset, 'spotify');
    assert.equal(app.spotifyStatus.state, 'access_denied');
    assert.equal(app.records.length, 0, 'Zero User A records remain in state');
    assert.ok(!app.records.some((r) => r.artist === 'Private Artist A'), 'No User A artists leaked to User B');
    assert.ok(!app.records.some((r) => r.artist === 'Bicep'), 'No demo records shown during Spotify access_denied');
    assert.equal(app.pollingActive, false, 'Polling halted on 403');
  });
});
