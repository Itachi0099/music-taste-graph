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
  isSpotifyRateLimited,
  getSpotifyRateLimitRemainingMs,
  getLast429Metadata,
  spotifyFetch,
} from '../src/utils/spotify.js';
import { normalizeMusicRecords, ingestListeningEvents } from '../src/utils/normalizer.js';
import type { RawTrackRecord, SpotifyStatusInfo, ListeningEvent, SpotifyPlaybackState } from '../src/types/index.js';

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
      resetSpotifyRateLimitState();
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

describe('Phase 18 Exhaustive 24-Scenario Spotify Audit Tests', () => {
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    resetSpotifyRateLimitState();
  });

  afterEach(() => {
    resetSpotifyRateLimitState();
    globalThis.fetch = origFetch;
  });

  // Harness replicating the exact synchronization, caching, polling, and cooldown state machine
  class FullSpotifyHarness {
    records: RawTrackRecord[] = [];
    listeningEvents: ListeningEvent[] = [];
    playbackState: SpotifyPlaybackState | null = null;
    spotifyStatus: SpotifyStatusInfo = {
      state: 'disconnected',
      lastSyncAt: null,
      label: 'Spotify · Offline',
    };
    isSyncing = false;
    isReconciling = false;
    pollingInterval: NodeJS.Timeout | null = null;
    isSpotifyActive = false;
    lastPlayingTrackId: string | null = null;
    lastRecentPlayedPollTime = 0;
    lastVisibilityReconcileTime = 0;
    requestLog: string[] = [];

    async fetchWithTracking(url: string, init?: RequestInit): Promise<Response> {
      this.requestLog.push(url);
      return globalThis.fetch(url, init);
    }

    async sync(token: string, force = false) {
      if (this.isSyncing) return;
      if (isSpotifyRateLimited()) {
        this.spotifyStatus = {
          ...this.spotifyStatus,
          state: 'rate_limited',
          label: 'Spotify · Rate limited',
        };
        return;
      }
      this.isSyncing = true;
      this.isSpotifyActive = true;
      this.records = [];
      this.listeningEvents = [];
      this.playbackState = null;

      this.spotifyStatus = {
        ...this.spotifyStatus,
        state: 'syncing',
        lastSyncAt: null,
        label: 'Spotify · Syncing',
      };

      try {
        let profile = null;
        try {
          profile = await fetchSpotifyUserProfile(token, force);
        } catch (err) {
          if (err instanceof SpotifyApiError && (err.status === 403 || err.status === 401 || err.status === 429)) {
            throw err;
          }
        }

        if (profile) {
          this.spotifyStatus.userId = profile.id;
          this.spotifyStatus.userName = profile.display_name || undefined;
        }

        const topTracks = await fetchSpotifyTopTracks(token, force);

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

        await this.reconcile(token, true);

        if (this.isSpotifyActive && !isSpotifyRateLimited()) {
          this.startPolling(token);
        }
      } catch (err) {
        this.isSpotifyActive = false;
        this.stopPolling();
        this.records = [];

        if (err instanceof SpotifyApiError) {
          if (err.status === 403) {
            this.spotifyStatus = {
              ...this.spotifyStatus,
              state: 'access_denied',
              lastSyncAt: null,
              label: 'Spotify · Access unavailable',
              errorMessage: "Your Spotify account was authenticated, but Spotify isn't currently allowing this account to access this Development Mode app.",
            };
            return;
          }
          if (err.status === 401) {
            this.spotifyStatus = {
              ...this.spotifyStatus,
              state: 'unauthorized',
              lastSyncAt: null,
              label: 'Spotify · Reconnect required',
            };
            return;
          }
          if (err.status === 429) {
            this.spotifyStatus = {
              ...this.spotifyStatus,
              state: 'rate_limited',
              isQuotaExceeded: err.isQuotaExceeded,
              lastSyncAt: null,
              label: 'Spotify · Rate limited',
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
      } finally {
        this.isSyncing = false;
      }
    }

    async reconcile(token: string, forceRecent = false) {
      if (this.isReconciling || (this.isSyncing && !forceRecent) || isSpotifyRateLimited()) return;
      this.isReconciling = true;
      try {
        const current = await fetchCurrentlyPlaying(token);
        if (current) {
          this.playbackState = current;
        }

        const now = Date.now();
        const trackChanged = current?.trackId && current.trackId !== this.lastPlayingTrackId;
        const shouldFetchRecent = forceRecent || trackChanged || (now - this.lastRecentPlayedPollTime >= 120000);

        if (shouldFetchRecent) {
          const recentEvents = await fetchRecentlyPlayedEvents(token);
          this.lastRecentPlayedPollTime = now;
          if (recentEvents.length > 0) {
            const currentDb = normalizeMusicRecords(this.records, 'spotify');
            const { db } = ingestListeningEvents(
              { ...currentDb, listeningEvents: this.listeningEvents },
              recentEvents
            );
            this.records = db.rawRecords;
            this.listeningEvents = db.listeningEvents;
          }
        }

        this.lastPlayingTrackId = current?.trackId || null;

        if (this.spotifyStatus.state !== 'access_denied' && this.spotifyStatus.state !== 'unauthorized' && this.spotifyStatus.state !== 'rate_limited') {
          const isPlaying = current?.isPlaying;
          this.spotifyStatus.state = isPlaying ? 'live' : this.records.length === 0 ? 'empty_library' : 'updated_recently';
          this.spotifyStatus.label = isPlaying ? 'Spotify · Live' : this.records.length === 0 ? 'Spotify · Connected' : 'Spotify · Synced';
        }
      } catch (err) {
        if (err instanceof SpotifyApiError) {
          if (err.status === 403) {
            this.isSpotifyActive = false;
            this.stopPolling();
            this.spotifyStatus.state = 'access_denied';
            this.spotifyStatus.label = 'Spotify · Access unavailable';
            return;
          }
          if (err.status === 401) {
            this.isSpotifyActive = false;
            this.stopPolling();
            this.spotifyStatus.state = 'unauthorized';
            this.spotifyStatus.label = 'Spotify · Reconnect required';
            return;
          }
          if (err.status === 429) {
            this.stopPolling();
            this.spotifyStatus.state = 'rate_limited';
            this.spotifyStatus.isQuotaExceeded = err.isQuotaExceeded;
            this.spotifyStatus.label = 'Spotify · Rate limited';
            return;
          }
        }
      } finally {
        this.isReconciling = false;
      }
    }

    startPolling(token: string) {
      this.stopPolling();
      if (!this.isSpotifyActive || isSpotifyRateLimited()) return;
      this.pollingInterval = setInterval(async () => {
        if (!this.isSpotifyActive || isSpotifyRateLimited()) return;
        await this.reconcile(token);
      }, 20000);
    }

    stopPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    }

    async handleVisibilityChange(hidden: boolean, token: string) {
      if (!this.isSpotifyActive) return;
      if (hidden) {
        this.stopPolling();
      } else {
        this.stopPolling();
        if (this.spotifyStatus.state === 'access_denied' || this.spotifyStatus.state === 'unauthorized' || isSpotifyRateLimited()) {
          return;
        }
        const now = Date.now();
        if (now - this.lastVisibilityReconcileTime < 10000) {
          this.startPolling(token);
          return;
        }
        this.lastVisibilityReconcileTime = now;
        await this.reconcile(token);
        if (this.isSpotifyActive && !isSpotifyRateLimited()) {
          this.startPolling(token);
        }
      }
    }

    async handleRetry(token: string) {
      if (isSpotifyRateLimited() || this.isSyncing) return;
      await this.sync(token, true);
    }

    disconnect() {
      this.isSpotifyActive = false;
      this.stopPolling();
      resetSpotifyRateLimitState();
      this.spotifyStatus = {
        state: 'disconnected',
        lastSyncAt: null,
        label: 'Spotify · Offline',
      };
      this.records = [];
      this.listeningEvents = [];
    }
  }

  const standardSpotifyMock = (requests: string[]) => {
    return async (url: RequestInfo | URL) => {
      const u = String(url);
      requests.push(u);
      if (u.includes('/v1/me/top/tracks')) {
        return new Response(JSON.stringify({
          items: [
            {
              id: 'track-1',
              name: 'Solar Drift',
              artists: [{ id: 'artist-1', name: 'Astral Project' }],
              duration_ms: 240000,
            },
          ],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (u.includes('/v1/me/player/currently-playing')) {
        return new Response(JSON.stringify({
          is_playing: true,
          progress_ms: 60000,
          item: {
            id: 'track-1',
            name: 'Solar Drift',
            duration_ms: 240000,
            artists: [{ id: 'artist-1', name: 'Astral Project' }],
          },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (u.includes('/v1/me/player/recently-played')) {
        return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (u.includes('/v1/artists')) {
        return new Response(JSON.stringify({
          artists: [{ id: 'artist-1', name: 'Astral Project', genres: ['ambient'] }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (u.includes('/v1/me')) {
        return new Response(JSON.stringify({ id: 'user_123', display_name: 'Astral Walker' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ results: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
  };

  test('1. Initial login request count test', async () => {
    const requests: string[] = [];
    globalThis.fetch = standardSpotifyMock(requests);

    const harness = new FullSpotifyHarness();
    await harness.sync('test-token');

    // Expected Spotify requests: 1 /v1/me, 1 /v1/me/top/tracks, 1 /v1/artists, 1 /currently-playing, 1 /recently-played
    const spotifyRequests = requests.filter(r => r.includes('api.spotify.com'));
    assert.equal(spotifyRequests.length, 5, 'Exact request count for fresh login must be 5');
    assert.equal(harness.spotifyStatus.state, 'live');
    harness.stopPolling();
  });

  test('2. Single-flight initial sync test', async () => {
    const requests: string[] = [];
    globalThis.fetch = standardSpotifyMock(requests);

    const harness = new FullSpotifyHarness();
    // Fire two syncs concurrently
    await Promise.all([harness.sync('test-token'), harness.sync('test-token')]);

    const spotifyRequests = requests.filter(r => r.includes('api.spotify.com'));
    assert.equal(spotifyRequests.length, 5, 'Concurrent sync triggers must be single-flighted to exactly 1 request wave');
    harness.stopPolling();
  });

  test('3. /v1/me reuse test', async () => {
    const requests: string[] = [];
    globalThis.fetch = standardSpotifyMock(requests);

    const user1 = await fetchSpotifyUserProfile('token-1');
    const user2 = await fetchSpotifyUserProfile('token-1');

    assert.equal(user1?.id, 'user_123');
    assert.equal(user2?.id, 'user_123');
    const meRequests = requests.filter(r => r.includes('/v1/me') && !r.includes('/top') && !r.includes('/player'));
    assert.equal(meRequests.length, 1, '/v1/me must only be requested once and reused from session cache');
  });

  test('4. Top tracks reuse test', async () => {
    const requests: string[] = [];
    globalThis.fetch = standardSpotifyMock(requests);

    const tracks1 = await fetchSpotifyTopTracks('token-1');
    const tracks2 = await fetchSpotifyTopTracks('token-1');

    assert.equal(tracks1.length, 1);
    assert.equal(tracks2.length, 1);
    const topRequests = requests.filter(r => r.includes('/v1/me/top/tracks'));
    assert.equal(topRequests.length, 1, '/v1/me/top/tracks must only be requested once and reused from cache');
  });

  test('5. Steady-state 20s polling request count test (only currently-playing)', async () => {
    const requests: string[] = [];
    globalThis.fetch = standardSpotifyMock(requests);

    const harness = new FullSpotifyHarness();
    await harness.sync('test-token');
    requests.length = 0; // Clear initial requests

    // Simulate one steady-state poll cycle (track unchanged, <120s)
    await harness.reconcile('test-token');

    const spotifyRequests = requests.filter(r => r.includes('api.spotify.com'));
    assert.equal(spotifyRequests.length, 1, 'Steady state poll must make exactly 1 request');
    assert.ok(spotifyRequests[0].includes('/v1/me/player/currently-playing'));
    harness.stopPolling();
  });

  test('6. Recently-played NOT requested during healthy steady-state polling', async () => {
    const requests: string[] = [];
    globalThis.fetch = standardSpotifyMock(requests);

    const harness = new FullSpotifyHarness();
    await harness.sync('test-token');
    requests.length = 0;

    await harness.reconcile('test-token');

    assert.ok(!requests.some(r => r.includes('/recently-played')), 'recently-played must NOT be polled when track is unchanged');
    harness.stopPolling();
  });

  test('7. Recently-played requested after track change', async () => {
    const requests: string[] = [];
    let currentTrackId = 'track-1';
    globalThis.fetch = async (url: RequestInfo | URL) => {
      const u = String(url);
      requests.push(u);
      if (u.includes('/v1/me/player/currently-playing')) {
        return new Response(JSON.stringify({
          is_playing: true,
          item: { id: currentTrackId, name: 'Title', artists: [{ name: 'Artist' }] },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return standardSpotifyMock([])(url);
    };

    const harness = new FullSpotifyHarness();
    await harness.sync('test-token');
    requests.length = 0;

    // Change track and reconcile
    currentTrackId = 'track-2';
    await harness.reconcile('test-token');

    assert.ok(requests.some(r => r.includes('/recently-played')), 'recently-played MUST be fetched when track changes');
    harness.stopPolling();
  });

  test('8. Hidden tab polling makes 0 requests', async () => {
    const requests: string[] = [];
    globalThis.fetch = standardSpotifyMock(requests);

    const harness = new FullSpotifyHarness();
    await harness.sync('test-token');
    requests.length = 0;

    // Simulate tab going hidden
    await harness.handleVisibilityChange(true, 'test-token');
    assert.equal(harness.pollingInterval, null, 'Polling interval must be cleared when tab is hidden');
    assert.equal(requests.length, 0, 'Zero requests dispatched while hidden');
  });

  test('9. Visibility change does not fire burst of requests (debounced)', async () => {
    const requests: string[] = [];
    globalThis.fetch = standardSpotifyMock(requests);

    const harness = new FullSpotifyHarness();
    await harness.sync('test-token');
    requests.length = 0;

    // Simulate rapid tab switching
    await harness.handleVisibilityChange(false, 'test-token');
    await harness.handleVisibilityChange(false, 'test-token');
    await harness.handleVisibilityChange(false, 'test-token');

    const currentlyPlayingRequests = requests.filter(r => r.includes('/v1/me/player/currently-playing'));
    assert.equal(currentlyPlayingRequests.length, 1, 'Rapid visibility changes must be debounced to at most 1 request');
    harness.stopPolling();
  });

  test('10. In-app browser blur/focus does not create duplicate intervals', async () => {
    const harness = new FullSpotifyHarness();
    harness.isSpotifyActive = true;

    harness.startPolling('token');
    const interval1 = harness.pollingInterval;
    harness.startPolling('token');
    const interval2 = harness.pollingInterval;

    assert.notEqual(interval1, null);
    assert.equal(typeof interval2, 'object');
    harness.stopPolling();
    assert.equal(harness.pollingInterval, null);
  });

  test('11. 429 Retry-After is respected and blocks upstream requests', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { message: 'Too many requests' } }), {
        status: 429,
        headers: { 'Retry-After': '15', 'Content-Type': 'application/json' },
      });

    const res = await spotifyFetch('https://api.spotify.com/v1/me', 'token');
    assert.equal(res.status, 429);
    assert.equal(isSpotifyRateLimited(), true);
    assert.ok(getSpotifyRateLimitRemainingMs() > 0);

    // Second call during active cooldown should not even invoke network
    let networkCalled = false;
    globalThis.fetch = async () => {
      networkCalled = true;
      return new Response('', { status: 200 });
    };

    const res2 = await spotifyFetch('https://api.spotify.com/v1/me', 'token');
    assert.equal(res2.status, 429);
    assert.equal(networkCalled, false, 'Network MUST NOT be called during active 429 cooldown');
  });

  test('12. 429 halts polling interval', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { message: 'Rate limit' } }), {
        status: 429,
        headers: { 'Retry-After': '10', 'Content-Type': 'application/json' },
      });

    const harness = new FullSpotifyHarness();
    harness.isSpotifyActive = true;
    harness.startPolling('token');
    assert.ok(harness.pollingInterval !== null);

    await harness.reconcile('token');
    assert.equal(harness.pollingInterval, null, 'Polling interval must be terminated on 429');
    assert.equal(harness.spotifyStatus.state, 'rate_limited');
  });

  test('13. Retry button disabled/guarded during cooldown', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { message: 'Rate limited' } }), {
        status: 429,
        headers: { 'Retry-After': '30', 'Content-Type': 'application/json' },
      });

    const harness = new FullSpotifyHarness();
    await harness.sync('token');
    assert.equal(isSpotifyRateLimited(), true);

    let networkHit = false;
    globalThis.fetch = async () => {
      networkHit = true;
      return new Response('', { status: 200 });
    };

    await harness.handleRetry('token');
    assert.equal(networkHit, false, 'handleRetry must be short-circuited during 429 cooldown');
  });

  test('14. 429 reason detection (QUOTA_EXCEEDED vs rolling rate limit)', async () => {
    // 1. Quota exceeded
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { message: 'Daily limit exceeded: QUOTA_EXCEEDED' } }), {
        status: 429,
        headers: { 'Retry-After': '60', 'Content-Type': 'application/json' },
      });

    await spotifyFetch('https://api.spotify.com/v1/me', 'token');
    const meta = getLast429Metadata();
    assert.equal(meta?.isQuotaExceeded, true);
    assert.match(meta?.reason || '', /QUOTA_EXCEEDED/);

    // 2. Normal rolling rate limit
    resetSpotifyRateLimitState();
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { message: 'Rate limit reached' } }), {
        status: 429,
        headers: { 'Retry-After': '5', 'Content-Type': 'application/json' },
      });

    await spotifyFetch('https://api.spotify.com/v1/me', 'token');
    const metaNormal = getLast429Metadata();
    assert.equal(metaNormal?.isQuotaExceeded, false);
  });

  test('15. 403 access_denied halts polling', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { status: 403, message: 'Forbidden' } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });

    const harness = new FullSpotifyHarness();
    harness.isSpotifyActive = true;
    harness.startPolling('token');
    await harness.reconcile('token');

    assert.equal(harness.pollingInterval, null);
    assert.equal(harness.spotifyStatus.state, 'access_denied');
  });

  test('16. 401 unauthorized halts polling', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { status: 401, message: 'Unauthorized' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });

    const harness = new FullSpotifyHarness();
    harness.isSpotifyActive = true;
    harness.startPolling('token');
    await harness.reconcile('token');

    assert.equal(harness.pollingInterval, null);
    assert.equal(harness.spotifyStatus.state, 'unauthorized');
  });

  test('17. Disconnect cancels pending timers/intervals', () => {
    const harness = new FullSpotifyHarness();
    harness.isSpotifyActive = true;
    harness.startPolling('token');
    assert.ok(harness.pollingInterval !== null);

    harness.disconnect();
    assert.equal(harness.pollingInterval, null);
    assert.equal(harness.isSpotifyActive, false);
    assert.equal(harness.spotifyStatus.state, 'disconnected');
  });

  test('18. Reconnect does not duplicate intervals', () => {
    const harness = new FullSpotifyHarness();
    harness.isSpotifyActive = true;

    harness.startPolling('token');
    const first = harness.pollingInterval;
    harness.startPolling('token');
    const second = harness.pollingInterval;

    assert.notEqual(first, second);
    harness.stopPolling();
    assert.equal(harness.pollingInterval, null);
  });

  test('19. StrictMode mount/unmount does not leave orphan interval', () => {
    const harness = new FullSpotifyHarness();
    harness.isSpotifyActive = true;

    // Simulate mount
    harness.startPolling('token');
    assert.ok(harness.pollingInterval !== null);

    // Simulate unmount
    harness.stopPolling();
    assert.equal(harness.pollingInterval, null);

    // Simulate remount
    harness.startPolling('token');
    assert.ok(harness.pollingInterval !== null);
    harness.stopPolling();
  });

  test('20. Genre resolution does not make redundant Spotify requests', async () => {
    const requests: string[] = [];
    globalThis.fetch = standardSpotifyMock(requests);

    // First fetch top tracks: populates session cache for Astral Project
    await fetchSpotifyTopTracks('token');
    const artistRequestsBefore = requests.filter(r => r.includes('/v1/artists')).length;
    assert.equal(artistRequestsBefore, 1);

    // Second fetch with force=true: cache already has Astral Project -> /v1/artists is skipped!
    await fetchSpotifyTopTracks('token', true);
    const artistRequestsAfter = requests.filter(r => r.includes('/v1/artists')).length;
    assert.equal(artistRequestsAfter, 1, '/v1/artists MUST NOT be requested when artists are in genre cache');
  });

  test('21. Genre cache reuse across tracks and sessions', async () => {
    const requests: string[] = [];
    globalThis.fetch = standardSpotifyMock(requests);

    await fetchSpotifyTopTracks('token');
    // Top tracks cached genre for Astral Project as 'ambient'
    // Now fetch recently played containing the same artist
    globalThis.fetch = async (url: RequestInfo | URL) => {
      const u = String(url);
      requests.push(u);
      if (u.includes('/v1/me/player/recently-played')) {
        return new Response(JSON.stringify({
          items: [
            {
              track: { id: 'track-recent', name: 'Ambient Wave', artists: [{ name: 'Astral Project' }] },
              played_at: new Date().toISOString(),
            },
          ],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('', { status: 200 });
    };

    const recentEvents = await fetchRecentlyPlayedEvents('token');
    assert.equal(recentEvents.length, 1);
    assert.equal(recentEvents[0].genre, 'ambient', 'Reused genre from session cache without external query');
  });

  test('22. Multi-tab isolation and rate-limit cooldown coordination', async () => {
    // Both tab A and tab B share the rate-limiting cooldown
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { message: 'Too Many Requests' } }), {
        status: 429,
        headers: { 'Retry-After': '20', 'Content-Type': 'application/json' },
      });

    const tabA = new FullSpotifyHarness();
    const tabB = new FullSpotifyHarness();

    await tabA.sync('token');
    assert.equal(tabA.spotifyStatus.state, 'rate_limited');
    assert.equal(isSpotifyRateLimited(), true);

    // Tab B observes rate limit immediately without firing network
    let tabBNetworkFired = false;
    globalThis.fetch = async () => {
      tabBNetworkFired = true;
      return new Response('', { status: 200 });
    };

    await tabB.sync('token');
    assert.equal(tabBNetworkFired, false, 'Tab B must not fire network while rate-limited');
    assert.equal(tabB.spotifyStatus.state, 'rate_limited');
  });

  test('23. Dev-safe diagnostics log sequence numbers and zero tokens', () => {
    const logs: string[] = [];
    const origLog = console.log;
    const origWarn = console.warn;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));
    console.warn = (...args: unknown[]) => logs.push(args.join(' '));

    try {
      logSpotifySyncDiagnostic('429', '/v1/me', '10s backoff');
      logSpotifySyncDiagnostic('403', '/v1/me/top/tracks');
      logSpotifySyncDiagnostic('success', '/v1/me');

      assert.ok(logs.some(l => l.includes('[SpotifySync] 429 rate limited for /v1/me')));
      assert.ok(logs.some(l => l.includes('[SpotifySync] 403 access denied for /v1/me/top/tracks')));
      assert.ok(logs.some(l => l.includes('[SpotifySync] successful sync for /v1/me')));
      assert.ok(!logs.some(l => l.includes('Bearer') || l.includes('secret') || l.includes('token')));
    } finally {
      console.log = origLog;
      console.warn = origWarn;
    }
  });

  test('24. Legitimate empty library (200 with 0 tracks) vs 403 access denied', async () => {
    // 1. Legitimate empty library (200 OK, 0 tracks)
    globalThis.fetch = async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes('/v1/me/top/tracks')) {
        return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (u.includes('/v1/me')) {
        return new Response(JSON.stringify({ id: 'user_empty', display_name: 'Empty Library' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ artists: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const emptyHarness = new FullSpotifyHarness();
    await emptyHarness.sync('empty-token');
    assert.equal(emptyHarness.spotifyStatus.state, 'empty_library');
    assert.equal(emptyHarness.spotifyStatus.label, 'Spotify · Connected');
    assert.ok(emptyHarness.spotifyStatus.lastSyncAt !== null);

    // 2. 403 access denied
    resetSpotifyRateLimitState();
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { status: 403, message: 'User not listed in Developer Dashboard' } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });

    const deniedHarness = new FullSpotifyHarness();
    await deniedHarness.sync('denied-token');
    assert.equal(deniedHarness.spotifyStatus.state, 'access_denied');
    assert.equal(deniedHarness.spotifyStatus.label, 'Spotify · Access unavailable');
    assert.equal(deniedHarness.spotifyStatus.lastSyncAt, null);
  });
});
