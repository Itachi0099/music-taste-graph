import type { RawTrackRecord, TasteProfile } from '../types';

/**
 * Extracts a normalized, provider-independent TasteProfile from any track dataset
 * (Spotify, CSV, JSON, Apple Music export, etc.).
 */
export function extractTasteProfile(records: RawTrackRecord[]): TasteProfile {
  if (!records.length) {
    return {
      genres: {},
      artists: {},
      subgenres: {},
      bpmRange: { min: 120, max: 130, preferred: 124 },
      totalTracks: 0,
      uniqueArtists: 0,
    };
  }

  const genreCounts: Record<string, number> = {};
  const artistCounts: Record<string, number> = {};
  const subgenreCounts: Record<string, number> = {};
  const bpmList: number[] = [];

  records.forEach((rec) => {
    const genre = (rec.genre || 'Electronic').trim();
    const artist = (rec.artist || 'Unknown Artist').trim();
    const subgenre = rec.subgenre?.trim();

    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    artistCounts[artist] = (artistCounts[artist] || 0) + 1;
    if (subgenre) {
      subgenreCounts[subgenre] = (subgenreCounts[subgenre] || 0) + 1;
    }

    if (rec.bpm && rec.bpm > 40 && rec.bpm < 240) {
      bpmList.push(rec.bpm);
    }
  });

  const total = records.length;

  // Normalize genre weights (sum to ~1.0)
  const genres: Record<string, number> = {};
  Object.entries(genreCounts).forEach(([g, count]) => {
    genres[g] = Number((count / total).toFixed(3));
  });

  // Normalize artist weights
  const maxArtistCount = Math.max(...Object.values(artistCounts), 1);
  const artists: Record<string, number> = {};
  Object.entries(artistCounts).forEach(([a, count]) => {
    artists[a] = Number((count / maxArtistCount).toFixed(3));
  });

  // Normalize subgenre weights
  const totalSubs = Object.values(subgenreCounts).reduce((acc, v) => acc + v, 0) || 1;
  const subgenres: Record<string, number> = {};
  Object.entries(subgenreCounts).forEach(([s, count]) => {
    subgenres[s] = Number((count / totalSubs).toFixed(3));
  });

  // BPM stats
  let bpmRange = { min: 110, max: 140, preferred: 125 };
  if (bpmList.length > 0) {
    bpmList.sort((a, b) => a - b);
    const min = bpmList[0];
    const max = bpmList[bpmList.length - 1];
    const sum = bpmList.reduce((acc, b) => acc + b, 0);
    const preferred = Math.round(sum / bpmList.length);
    bpmRange = { min, max, preferred };
  }

  return {
    genres,
    artists,
    subgenres,
    bpmRange,
    totalTracks: records.length,
    uniqueArtists: Object.keys(artistCounts).length,
  };
}
