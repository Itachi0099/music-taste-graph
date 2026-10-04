import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deriveBlackHoles } from '../src/utils/blackHoleEngine.js';
import { buildCelestialUniverse } from '../src/utils/universeBuilder.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawTrackRecord, ListeningEvent } from '../src/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const unifiedRaw: RawTrackRecord[] = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../src/data/unified_universe.json'), 'utf8')
);

describe('Signal Satellites & Dynamic Black Holes Celestial Architecture', () => {
  const universe = buildCelestialUniverse(unifiedRaw, true, [], null);

  describe('1. Signal Satellites Derivation & Relationship Mechanics', () => {
    it('generates signal satellites from verified cross-genre bridges in unified universe', () => {
      assert.ok(universe.signalSatellites, 'Universe must include signalSatellites array');
      assert.ok(universe.signalSatellites.length > 0, 'Must have at least one signal satellite');

      // Check bridge artist satellite exists (e.g. Aphex Twin, Radiohead, Eric Prydz, MGMT, etc.)
      const bridgeSats = universe.signalSatellites.filter((s) => s.relationshipType === 'bridge_artist');
      assert.ok(bridgeSats.length > 0, 'Must have bridge artist satellites');

      bridgeSats.forEach((sat) => {
        assert.ok(sat.id.startsWith('signal-'), `Satellite id should start with signal-: ${sat.id}`);
        assert.ok(sat.sourceGenre, 'Must have sourceGenre');
        assert.ok(sat.targetGenre, 'Must have targetGenre');
        assert.ok(sat.strength >= 0 && sat.strength <= 1, 'Strength must be between 0 and 1');
        assert.ok(Number.isFinite(sat.x) && Number.isFinite(sat.y), 'Coordinates must be finite numbers');
        assert.ok(sat.radius >= 3.5, 'Satellite radius must be at least 3.5');
        assert.ok(sat.bridgeArtist, 'Bridge satellite must have bridgeArtist');
      });
    });

    it('deduplicates pairwise relationships without unordered collision duplicates', () => {
      const seenPairs = new Set<string>();
      universe.signalSatellites!.forEach((sat) => {
        const pairKey = [sat.sourceGenre, sat.targetGenre].sort().join(':::');
        assert.ok(!seenPairs.has(pairKey), `Pair ${pairKey} must not be duplicated in signal satellites`);
        seenPairs.add(pairKey);
      });
    });

    it('positions satellites along the curved gravitational midpoint between related systems', () => {
      universe.signalSatellites!.forEach((sat) => {
        const gA = universe.genres.find((g) => g.name === sat.sourceGenre);
        const gB = universe.genres.find((g) => g.name === sat.targetGenre);
        if (gA && gB) {
          const distA = Math.hypot(sat.x - gA.x, sat.y - gA.y);
          const distB = Math.hypot(sat.x - gB.x, sat.y - gB.y);
          const totalDist = Math.hypot(gA.x - gB.x, gA.y - gB.y);
          assert.ok(distA < totalDist * 1.5 && distB < totalDist * 1.5, 'Satellite should be spatially bounded between systems');
        }
      });
    });
  });

  describe('2. Dynamic Black Holes Behavioral Gravitational Singularities', () => {
    it('produces ZERO black holes for balanced normal listening data', () => {
      assert.ok(universe.blackHoles, 'Universe must include blackHoles array');
      assert.strictEqual(
        universe.blackHoles.length,
        0,
        'Balanced demo library at rest must not trigger false-positive black holes'
      );
    });

    it('dynamically spawns an Artist Black Hole under extreme artist obsession (high repeats & concentration)', () => {
      const concentratedEvents: ListeningEvent[] = [];
      // 25 repeat plays of "Damru" in Psytrance within recent history
      for (let i = 0; i < 25; i++) {
        concentratedEvents.push({
          id: `obsess-${i}`,
          trackId: 'damru-track-1',
          trackTitle: 'Shiva Chant',
          artistName: 'Damru',
          genre: 'Psytrance',
          subgenre: 'Ragatrance',
          playedAt: new Date(Date.now() - i * 180000).toISOString(),
          source: 'spotify_recent',
        });
      }
      // Add 3 other tracks by 3 different artists to simulate total interactions
      concentratedEvents.push(
        { id: 'other-1', trackId: 't-1', trackTitle: 'O1', artistName: 'Artist One', genre: 'House', playedAt: new Date().toISOString(), source: 'spotify_recent' },
        { id: 'other-2', trackId: 't-2', trackTitle: 'O2', artistName: 'Artist Two', genre: 'Techno', playedAt: new Date().toISOString(), source: 'spotify_recent' },
        { id: 'other-3', trackId: 't-3', trackTitle: 'O3', artistName: 'Artist Three', genre: 'Ambient', playedAt: new Date().toISOString(), source: 'spotify_recent' }
      );

      const blackHoles = deriveBlackHoles({
        artists: universe.artists,
        genres: universe.genres,
        listeningEvents: concentratedEvents,
        records: unifiedRaw,
      });

      assert.strictEqual(blackHoles.length, 1, 'Must spawn exactly 1 black hole for extreme artist dominance');
      const bh = blackHoles[0];
      assert.strictEqual(bh.type, 'artist');
      assert.strictEqual(bh.subjectName, 'Damru');
      assert.ok(bh.gravityScore >= 0.78, `Gravity score should exceed threshold: ${bh.gravityScore}`);
      assert.ok(bh.eventHorizonRadius >= 20, 'Event horizon radius must be substantial');
    });

    it('dynamically spawns a Genre Black Hole when a single genre overwhelmingly dominates listening', () => {
      const concentratedEvents: ListeningEvent[] = [];
      // 30 plays across different artists, but all in "Techno"
      for (let i = 0; i < 30; i++) {
        concentratedEvents.push({
          id: `techno-${i}`,
          trackId: `techno-trk-${i}`,
          trackTitle: `Techno Track ${i}`,
          artistName: `Techno DJ ${i % 8}`,
          genre: 'Techno',
          subgenre: 'Peak Time Techno',
          playedAt: new Date(Date.now() - i * 300000).toISOString(),
          source: 'spotify_recent',
        });
      }
      // 3 plays in other genres
      concentratedEvents.push(
        { id: 'o-1', trackId: 'o1', trackTitle: 'Rock Trk', artistName: 'Rocker', genre: 'Alternative Rock', playedAt: new Date().toISOString(), source: 'spotify_recent' },
        { id: 'o-2', trackId: 'o2', trackTitle: 'Jazz Trk', artistName: 'Jazzer', genre: 'Jazz', playedAt: new Date().toISOString(), source: 'spotify_recent' },
        { id: 'o-3', trackId: 'o3', trackTitle: 'Pop Trk', artistName: 'Popper', genre: 'Pop', playedAt: new Date().toISOString(), source: 'spotify_recent' }
      );

      const blackHoles = deriveBlackHoles({
        artists: universe.artists,
        genres: universe.genres,
        listeningEvents: concentratedEvents,
        records: unifiedRaw,
      });

      assert.ok(blackHoles.length >= 1, 'Must spawn at least 1 black hole for extreme genre dominance');
      const genreBh = blackHoles.find((b) => b.subjectGenre === 'Techno');
      assert.ok(genreBh, 'Techno genre black hole must exist');
      assert.ok(genreBh.gravityScore >= 0.80, `Gravity score should be >= 0.80: ${genreBh.gravityScore}`);
    });
  });

  describe('3. Multi-User Isolation & State Clearing', () => {
    it('clears all black holes and dynamically recomputes on user switch without state leakage', () => {
      // User A has extreme obsession
      const userAEvents: ListeningEvent[] = [];
      for (let i = 0; i < 20; i++) {
        userAEvents.push({
          id: `ua-${i}`,
          trackId: 'damru-1',
          trackTitle: 'Shiva',
          artistName: 'Damru',
          genre: 'Psytrance',
          playedAt: new Date().toISOString(),
          source: 'spotify_recent',
        });
      }

      const userABlackHoles = deriveBlackHoles({
        artists: universe.artists,
        genres: universe.genres,
        listeningEvents: userAEvents,
        records: unifiedRaw,
      });
      assert.ok(userABlackHoles.length > 0, 'User A should have black holes');

      // User B connects with fresh balanced listening:
      const userBEvents: ListeningEvent[] = [
        { id: 'ub-1', trackId: 'b-1', trackTitle: 'B1', artistName: 'Artist B1', genre: 'House', playedAt: new Date().toISOString(), source: 'spotify_recent' },
        { id: 'ub-2', trackId: 'b-2', trackTitle: 'B2', artistName: 'Artist B2', genre: 'Techno', playedAt: new Date().toISOString(), source: 'spotify_recent' },
      ];

      const userBBlackHoles = deriveBlackHoles({
        artists: universe.artists,
        genres: universe.genres,
        listeningEvents: userBEvents,
        records: unifiedRaw,
      });
      assert.strictEqual(userBBlackHoles.length, 0, 'User B must have ZERO black holes (no leakage from User A)');
    });
  });
});
