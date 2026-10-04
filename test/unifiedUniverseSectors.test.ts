import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isSectorId,
  getSector,
  getSectorCameraTarget,
  isGenreInSector,
  isArtistInSector,
} from '../src/utils/sectors.js';
import { normalizeMusicRecords } from '../src/utils/normalizer.js';
import { buildCelestialUniverse } from '../src/utils/universeBuilder.js';
import { evaluateGenreEvidence } from '../src/utils/genreKnowledge/evidenceEngine.js';
import type { RawTrackRecord, UniverseArtist } from '../src/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../src/data');

describe('Unified Music Universe & Sector Views Architecture', () => {
  const ecRaw: RawTrackRecord[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'electronic_club.json'), 'utf8')
  );
  const iaRaw: RawTrackRecord[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'indie_alternative.json'), 'utf8')
  );
  const emRaw: RawTrackRecord[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'eclectic_mix.json'), 'utf8')
  );
  const unifiedRaw: RawTrackRecord[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'unified_universe.json'), 'utf8')
  );

  it('1. Data Integrity & Lossless Union: Exactly 72 tracks and 39 unique artists with zero loss', () => {
    assert.strictEqual(ecRaw.length, 27, 'Electronic / Club must have 27 tracks');
    assert.strictEqual(iaRaw.length, 21, 'Indie / Alternative must have 21 tracks');
    assert.strictEqual(emRaw.length, 24, 'Eclectic Mix must have 24 tracks');

    const totalRaw = ecRaw.length + iaRaw.length + emRaw.length;
    assert.strictEqual(totalRaw, 72, 'Source sum must be exactly 72 tracks');
    assert.strictEqual(unifiedRaw.length, 72, 'Unified demo universe must preserve all 72 tracks');

    // Verify all source tracks exist in unified universe
    const unifiedTrackKeys = new Set(
      unifiedRaw.map((t) => `${t.artist.toLowerCase()}:::${t.track.toLowerCase()}`)
    );

    [...ecRaw, ...iaRaw, ...emRaw].forEach((srcTrack) => {
      const key = `${srcTrack.artist.toLowerCase()}:::${srcTrack.track.toLowerCase()}`;
      assert.ok(
        unifiedTrackKeys.has(key),
        `Source track "${srcTrack.artist} - ${srcTrack.track}" must exist in unified universe`
      );
    });

    // Verify 39 unique artists
    const uniqueArtists = new Set(unifiedRaw.map((t) => t.artist.toLowerCase()));
    assert.strictEqual(uniqueArtists.size, 39, 'Must contain exactly 39 unique artists');
  });

  it('2. Zero duplicate tracks and zero duplicate entities in unified dataset', () => {
    const seen = new Set<string>();
    let duplicates = 0;

    unifiedRaw.forEach((t) => {
      const key = `${t.artist.toLowerCase()} - ${t.track.toLowerCase()}`;
      if (seen.has(key)) {
        duplicates++;
      }
      seen.add(key);
    });

    assert.strictEqual(duplicates, 0, 'Unified universe must have 0 duplicate tracks');
    assert.strictEqual(seen.size, 72, 'Must have 72 distinct canonical track keys');
  });

  it('3. Authoritative Genre Knowledge Engine resolution across all 72 tracks', () => {
    const canonicalGenres = new Set<string>();
    const subgenres = new Set<string>();
    let unknownCount = 0;

    unifiedRaw.forEach((t) => {
      const ev = evaluateGenreEvidence({
        artistName: t.artist,
        trackTitle: t.track,
        spotifyGenres: [t.genre, t.subgenre || ''].filter(Boolean),
      });

      assert.notStrictEqual(ev.canonicalGenre, 'Unknown', `Track ${t.artist} - ${t.track} must not be Unknown`);
      canonicalGenres.add(ev.canonicalGenre);
      if (ev.subgenre && ev.subgenre !== 'Unknown') {
        subgenres.add(ev.subgenre);
      }
      if (ev.canonicalGenre === 'Unknown') unknownCount++;
    });

    assert.strictEqual(unknownCount, 0, 'Unified demo universe must have 0 unknown genres');
    assert.strictEqual(canonicalGenres.size, 20, 'Must represent 20 canonical genre systems');
    assert.ok(subgenres.size >= 30, 'Must resolve rich subgenre metadata (30+ subgenres)');
  });

  it('4. Multi-genre artists remain ONE single canonical entity with multiple genre associations', () => {
    const db = normalizeMusicRecords(unifiedRaw, 'preset');
    assert.strictEqual(db.tracks.size, 72, 'Normalized DB must have 72 tracks');
    assert.strictEqual(db.artists.size, 39, 'Normalized DB must have exactly 39 unique artists');

    // Artists with multi-genre tracks
    const ericPrydz = Array.from(db.artists.values()).find(
      (a) => a.name.toLowerCase() === 'eric prydz'
    );
    assert.ok(ericPrydz, 'Eric Prydz must exist in normalized DB');
    assert.ok(ericPrydz.genres.length >= 2, 'Eric Prydz must span multiple canonical genres');
    assert.ok(ericPrydz.genres.includes('Progressive House'), 'Eric Prydz spans Progressive House');
    assert.ok(ericPrydz.genres.includes('House'), 'Eric Prydz spans House');

    const radiohead = Array.from(db.artists.values()).find(
      (a) => a.name.toLowerCase() === 'radiohead'
    );
    assert.ok(radiohead, 'Radiohead must exist');
    assert.ok(radiohead.genres.includes('Alternative Rock'));
    assert.ok(radiohead.genres.includes('Ambient'));
  });

  it('5. Sector Definitions & Membership Verification', () => {
    assert.ok(isSectorId('all'));
    assert.ok(isSectorId('electronic'));
    assert.ok(isSectorId('indie'));
    assert.ok(isSectorId('eclectic'));
    assert.strictEqual(isSectorId('invalid_sector'), false);

    const electronicDef = getSector('electronic');
    assert.strictEqual(electronicDef.id, 'electronic');
    assert.strictEqual(electronicDef.name, 'Electronic / Club');
    assert.ok(electronicDef.includedCanonicalGenres.includes('Techno'));
    assert.ok(electronicDef.includedCanonicalGenres.includes('House'));
    assert.ok(electronicDef.includedCanonicalGenres.includes('Trance'));

    const indieDef = getSector('indie');
    assert.strictEqual(indieDef.id, 'indie');
    assert.ok(indieDef.includedCanonicalGenres.includes('Indie Rock'));
    assert.ok(indieDef.includedCanonicalGenres.includes('Alternative Rock'));

    const eclecticDef = getSector('eclectic');
    assert.strictEqual(eclecticDef.id, 'eclectic');
    assert.ok(eclecticDef.includedCanonicalGenres.includes('Hip Hop'));
    assert.ok(eclecticDef.includedCanonicalGenres.includes('Jazz'));
    assert.ok(eclecticDef.includedCanonicalGenres.includes('Trip Hop'));
  });

  it('6. Spatial Sector Navigation & Camera Targeting: One galaxy with coherent coordinates', () => {
    const celestialUniverse = buildCelestialUniverse(unifiedRaw, true, [], null);
    assert.strictEqual(celestialUniverse.genres.length, 20, 'Must have 20 genre systems in celestial space');
    assert.strictEqual(celestialUniverse.artists.length, 39, 'Must have 39 artists in celestial space');

    // Full Universe Overview
    const fullTarget = getSectorCameraTarget('all', celestialUniverse.genres);
    assert.strictEqual(fullTarget.x, 0, 'Full universe centers at origin X');
    assert.strictEqual(fullTarget.y, 0, 'Full universe centers at origin Y');
    assert.strictEqual(fullTarget.destName, 'Full Universe');

    // Electronic Sector Target
    const electronicTarget = getSectorCameraTarget('electronic', celestialUniverse.genres);
    assert.strictEqual(electronicTarget.destName, 'Electronic / Club Sector');
    assert.ok(electronicTarget.x > 0, 'Electronic sector has positive X');
    assert.ok(electronicTarget.y > 0, 'Electronic sector has positive Y');

    // Indie Sector Target
    const indieTarget = getSectorCameraTarget('indie', celestialUniverse.genres);
    assert.strictEqual(indieTarget.destName, 'Indie / Alternative Sector');
    assert.ok(indieTarget.x > 0, 'Indie sector has positive X');
    assert.ok(indieTarget.y < 0, 'Indie sector has negative Y');

    // Eclectic Sector Target
    const eclecticTarget = getSectorCameraTarget('eclectic', celestialUniverse.genres);
    assert.strictEqual(eclecticTarget.destName, 'Eclectic Mix Sector');
    assert.ok(eclecticTarget.x < 0, 'Eclectic sector has negative X');

    // The three sector centroids must be clearly distinct in celestial space
    const distElecIndie = Math.hypot(
      electronicTarget.x - indieTarget.x,
      electronicTarget.y - indieTarget.y
    );
    const distElecEclec = Math.hypot(
      electronicTarget.x - eclecticTarget.x,
      electronicTarget.y - eclecticTarget.y
    );
    assert.ok(distElecIndie > 500, 'Electronic and Indie sectors must be well separated spatially');
    assert.ok(distElecEclec > 500, 'Electronic and Eclectic sectors must be well separated spatially');
  });

  it('7. Sector Membership Filtering helpers: isGenreInSector and isArtistInSector', () => {
    // In Full Universe ('all'), everything is included
    assert.strictEqual(isGenreInSector('Techno', 'all'), true);
    assert.strictEqual(isGenreInSector('Indie Rock', 'all'), true);
    assert.strictEqual(isGenreInSector('Hip Hop', 'all'), true);

    // In Electronic sector
    assert.strictEqual(isGenreInSector('Techno', 'electronic'), true);
    assert.strictEqual(isGenreInSector('Hip Hop', 'electronic'), false);

    // In Indie sector
    assert.strictEqual(isGenreInSector('Indie Rock', 'indie'), true);
    assert.strictEqual(isGenreInSector('Techno', 'indie'), false);

    // Cross-genre artist checking
    const mockArtist: UniverseArtist = {
      id: 'artist-test',
      name: 'Radiohead',
      primaryGenre: 'Alternative Rock',
      secondaryGenres: ['Ambient'],
      trackCount: 3,
      systemId: 'genre-Alternative Rock',
      orbitRadius: 100,
      orbitSpeed: 0.01,
      angle: 0,
      x: 100,
      y: 100,
      radius: 10,
      color: '#fff',
      celestialColor: {} as any,
      tracks: [],
    };

    // Radiohead's primary genre is Alternative Rock (in Indie), secondary is Ambient (in Eclectic)
    assert.strictEqual(isArtistInSector(mockArtist, 'all'), true);
    assert.strictEqual(isArtistInSector(mockArtist, 'indie'), true);
    assert.strictEqual(isArtistInSector(mockArtist, 'eclectic'), true);
    assert.strictEqual(isArtistInSector(mockArtist, 'electronic'), false);
  });
});
