import fs from 'fs';
import { evaluateGenreEvidence } from '../src/utils/genreKnowledge/evidenceEngine';

const ec = JSON.parse(fs.readFileSync('src/data/electronic_club.json', 'utf8'));
const ia = JSON.parse(fs.readFileSync('src/data/indie_alternative.json', 'utf8'));
const em = JSON.parse(fs.readFileSync('src/data/eclectic_mix.json', 'utf8'));

function analyzeDataset(name: string, tracks: any[]) {
  const artists = new Set<string>();
  const canonicalGenres = new Set<string>();
  const subgenres = new Set<string>();
  let unknownCount = 0;

  for (const t of tracks) {
    artists.add(t.artist.trim());
    const res = evaluateGenreEvidence({
      artistName: t.artist,
      trackTitle: t.track,
      spotifyGenres: [t.genre, t.subgenre || ''].filter(Boolean),
    });
    canonicalGenres.add(res.canonicalGenre);
    if (res.subgenre && res.subgenre !== 'Unknown') subgenres.add(res.subgenre);
    if (res.canonicalGenre === 'Unknown') unknownCount++;
  }

  console.log(`\n=== ${name} ===`);
  console.log(`Tracks: ${tracks.length}`);
  console.log(`Artists: ${artists.size}`);
  console.log(`Canonical Genres (${canonicalGenres.size}):`, [...canonicalGenres].sort());
  console.log(`Subgenres (${subgenres.size}):`, [...subgenres].sort());
  console.log(`Unknown: ${unknownCount}`);
  return { tracks, artists, canonicalGenres, subgenres };
}

analyzeDataset('Electronic / Club', ec);
analyzeDataset('Indie / Alternative', ia);
analyzeDataset('Eclectic Mix', em);

// Merged dataset
const mergedTracks = [...ec, ...ia, ...em];
const unifiedArtists = new Set<string>();
const unifiedGenres = new Set<string>();
const unifiedSubgenres = new Set<string>();
let unifiedUnknown = 0;

const trackKeyMap = new Map<string, any>();
let duplicateTrackCount = 0;

for (const t of mergedTracks) {
  const key = (t.artist.trim() + ' - ' + t.track.trim()).toLowerCase();
  if (trackKeyMap.has(key)) {
    duplicateTrackCount++;
  } else {
    trackKeyMap.set(key, t);
  }
  unifiedArtists.add(t.artist.trim());
  const res = evaluateGenreEvidence({
    artistName: t.artist,
    trackTitle: t.track,
    spotifyGenres: [t.genre, t.subgenre || ''].filter(Boolean),
  });
  unifiedGenres.add(res.canonicalGenre);
  if (res.subgenre && res.subgenre !== 'Unknown') unifiedSubgenres.add(res.subgenre);
  if (res.canonicalGenre === 'Unknown') unifiedUnknown++;
}

console.log('\n=== UNIFIED DEMO UNIVERSE ===');
console.log('Total Tracks:', mergedTracks.length);
console.log('Unique Tracks:', trackKeyMap.size);
console.log('Duplicate Tracks:', duplicateTrackCount);
console.log('Unique Artists:', unifiedArtists.size);
console.log('Canonical Genres (' + unifiedGenres.size + '):', [...unifiedGenres].sort());
console.log('Subgenres (' + unifiedSubgenres.size + '):', [...unifiedSubgenres].sort());
console.log('Unknown:', unifiedUnknown);

import { buildCelestialUniverse } from '../src/utils/universeBuilder';
const universe = buildCelestialUniverse(mergedTracks, true, [], null);
console.log('Universe Genres:', universe.genres.length);
console.log('Universe Artists:', universe.artists.length);
console.log('Universe Tracks:', universe.allTracks.length);

const sectorGenres = {
  electronic: ['Alternative Dance', 'Breakbeat', 'Electronic', 'House', 'Nu Disco', 'Progressive House', 'Synth-pop', 'Techno', 'Trance'],
  indie: ['Alternative Dance', 'Alternative Rock', 'Indie Pop', 'Indie Rock', 'Post-Punk Revival', 'Synth-pop'],
  eclectic: ['Alternative Rock', 'Ambient', 'French House', 'Hip Hop', 'IDM', 'Jazz', 'R&B', 'Synth-pop', 'Trip Hop'],
};

for (const [sName, sGenres] of Object.entries(sectorGenres)) {
  const matches = universe.genres.filter(g => sGenres.includes(g.name));
  const avgX = matches.reduce((sum, g) => sum + g.x, 0) / matches.length;
  const avgY = matches.reduce((sum, g) => sum + g.y, 0) / matches.length;
  console.log(`Sector ${sName}: ${matches.length} genres matched. Centroid: (${avgX.toFixed(1)}, ${avgY.toFixed(1)})`);
}

