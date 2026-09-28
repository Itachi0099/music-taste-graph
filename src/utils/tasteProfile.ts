import type { RawTrackRecord, TasteProfile } from '../types';

/**
 * Extracts a normalized, deterministic, provider-independent TasteProfile.
 * Derives explainable behavioral dimensions:
 * - genreDistribution & artistAffinity
 * - explorationScore: novelty vs repeat behavior
 * - diversityScore: Shannon entropy across genre spectrum
 * - genreGravity: gravitational pull of dominant vs peripheral systems
 * - energyProfile, grooveProfile, chillProfile, intensityProfile
 */
export function extractTasteProfile(records: RawTrackRecord[]): TasteProfile {
  if (!records.length) {
    return {
      genreDistribution: {},
      artistAffinity: {},
      subgenreDistribution: {},
      explorationScore: 0.5,
      diversityScore: 0.5,
      genreGravity: {},
      artistConcentration: 0.5,
      repeatBehavior: 0.5,
      listeningIntensity: 0.5,
      energyProfile: 50,
      grooveProfile: 50,
      chillProfile: 50,
      intensityProfile: 50,
      bpmRange: { min: 120, max: 130, preferred: 124 },
      genres: {},
      artists: {},
      subgenres: {},
      totalTracks: 0,
      uniqueArtists: 0,
      uniqueGenres: 0,
    };
  }

  const genreCounts: Record<string, number> = {};
  const artistCounts: Record<string, number> = {};
  const subgenreCounts: Record<string, number> = {};
  const bpmList: number[] = [];

  records.forEach((rec) => {
    const genre = (rec.genre || 'Unknown').trim();
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
  const numUniqueGenres = Object.keys(genreCounts).length;
  const numUniqueArtists = Object.keys(artistCounts).length;

  // 1. Normalized Genre Distribution (proportions summing to 1.0)
  const genreDistribution: Record<string, number> = {};
  const genreGravity: Record<string, number> = {};
  Object.entries(genreCounts).forEach(([g, count]) => {
    const ratio = count / total;
    genreDistribution[g] = Number(ratio.toFixed(3));
    // Genre gravity scales with non-linear mass (super-linear for dominant)
    genreGravity[g] = Number(Math.pow(ratio, 0.75).toFixed(3));
  });

  // 2. Normalized Artist Affinity
  const maxArtistCount = Math.max(...Object.values(artistCounts), 1);
  const artistAffinity: Record<string, number> = {};
  Object.entries(artistCounts).forEach(([a, count]) => {
    artistAffinity[a] = Number((count / maxArtistCount).toFixed(3));
  });

  // 3. Subgenre distribution
  const totalSubs = Object.values(subgenreCounts).reduce((acc, v) => acc + v, 0) || 1;
  const subgenreDistribution: Record<string, number> = {};
  Object.entries(subgenreCounts).forEach(([s, count]) => {
    subgenreDistribution[s] = Number((count / totalSubs).toFixed(3));
  });

  // 4. BPM stats & derived rhythm profiles
  let bpmRange = { min: 110, max: 140, preferred: 125 };
  let avgBpm = 124;
  let chillCount = 0;
  let grooveCount = 0;
  let peakEnergyCount = 0;
  let intenseCount = 0;

  if (bpmList.length > 0) {
    bpmList.sort((a, b) => a - b);
    const min = bpmList[0];
    const max = bpmList[bpmList.length - 1];
    const sum = bpmList.reduce((acc, b) => acc + b, 0);
    avgBpm = Math.round(sum / bpmList.length);
    bpmRange = { min, max, preferred: avgBpm };

    bpmList.forEach((bpm) => {
      if (bpm < 105) chillCount++;
      else if (bpm <= 126) grooveCount++;
      else if (bpm <= 138) peakEnergyCount++;
      else intenseCount++;
    });
  }

  const validBpmTotal = bpmList.length || 1;
  const chillProfile = Math.round((chillCount / validBpmTotal) * 100);
  const grooveProfile = Math.round((grooveCount / validBpmTotal) * 100);
  const energyProfile = Math.round((peakEnergyCount / validBpmTotal) * 100);
  const intensityProfile = Math.round((intenseCount / validBpmTotal) * 100);

  // 5. Diversity Score: Normalized Shannon Entropy of genres
  let entropy = 0;
  Object.values(genreDistribution).forEach((p) => {
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  });
  const maxPossibleEntropy = Math.log2(Math.max(2, numUniqueGenres));
  const diversityScore = Number((entropy / maxPossibleEntropy).toFixed(2));

  // 6. Exploration vs Repeat Behavior
  // High unique artist to track ratio -> high exploration
  const artistRatio = numUniqueArtists / total;
  const explorationScore = Number(Math.min(1.0, Math.max(0.0, artistRatio * 0.85 + (diversityScore * 0.15))).toFixed(2));
  const repeatBehavior = Number((1.0 - explorationScore).toFixed(2));

  // 7. Artist concentration (Herfindahl-Hirschman index equivalent for artists)
  let sumSquaredArtistShare = 0;
  Object.values(artistCounts).forEach((count) => {
    const share = count / total;
    sumSquaredArtistShare += share * share;
  });
  const artistConcentration = Number(Math.min(1.0, Math.sqrt(sumSquaredArtistShare)).toFixed(2));

  const listeningIntensity = Number(Math.min(1.0, (avgBpm / 150) * 0.7 + (intensityProfile / 100) * 0.3).toFixed(2));

  return {
    genreDistribution,
    artistAffinity,
    subgenreDistribution,
    explorationScore,
    diversityScore,
    genreGravity,
    artistConcentration,
    repeatBehavior,
    listeningIntensity,
    energyProfile,
    grooveProfile,
    chillProfile,
    intensityProfile,
    bpmRange,
    // Compatibility fields
    genres: genreDistribution,
    artists: artistAffinity,
    subgenres: subgenreDistribution,
    totalTracks: total,
    uniqueArtists: numUniqueArtists,
    uniqueGenres: numUniqueGenres,
  };
}
