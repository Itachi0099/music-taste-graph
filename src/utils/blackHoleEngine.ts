import type {
  RawTrackRecord,
  ListeningEvent,
  TasteProfile,
  UniverseGenreSystem,
  UniverseArtist,
  UniverseBlackHole,
} from '../types';
import { getCelestialGenreColor } from './celestialColors';

export interface BlackHoleEvaluationContext {
  records?: RawTrackRecord[];
  listeningEvents?: ListeningEvent[];
  tasteProfile?: TasteProfile;
  genres: UniverseGenreSystem[];
  artists: UniverseArtist[];
}

/**
 * Deterministically evaluates listening gravity across artists, genres, and clusters.
 * Spawns a Black Hole ONLY when extreme behavioral listening gravity exceeds the high threshold (>= 0.78).
 * Pure function: deterministic, zero side effects, no physics simulation, zero external state.
 */
export function deriveBlackHoles(context: BlackHoleEvaluationContext): UniverseBlackHole[] {
  const { records = [], listeningEvents = [], genres, artists } = context;

  // Insufficient data cannot produce a black hole
  if (records.length < 8 && listeningEvents.length < 6) {
    return [];
  }

  const blackHoles: UniverseBlackHole[] = [];

  // 1. Analyze Artist Concentration and Repeat Listening
  const artistPlayCounts = new Map<string, number>();
  const totalEvents = listeningEvents.length;

  if (totalEvents > 0) {
    listeningEvents.forEach((evt) => {
      const a = evt.artistName.trim();
      artistPlayCounts.set(a, (artistPlayCounts.get(a) || 0) + 1);
    });
  } else {
    // If no dynamic listening events yet, inspect library track distribution
    records.forEach((r) => {
      const a = r.artist.trim();
      artistPlayCounts.set(a, (artistPlayCounts.get(a) || 0) + 1);
    });
  }

  const totalInteractions = totalEvents > 0 ? totalEvents : records.length;
  const sortedArtists = Array.from(artistPlayCounts.entries()).sort((a, b) => b[1] - a[1]);

  if (sortedArtists.length > 0) {
    const [topArtistName, topArtistCount] = sortedArtists[0];
    const secondArtistCount = sortedArtists[1]?.[1] || 1;

    // Minimum requirement: at least 6 plays/tracks for top artist
    if (topArtistCount >= 6) {
      const concentration = topArtistCount / Math.max(1, totalInteractions);
      const dominanceRatio = topArtistCount / Math.max(1, secondArtistCount);

      // Repeat factor (events vs unique tracks)
      const uniqueTracksByTopArtist = new Set(
        records.filter((r) => r.artist.toLowerCase() === topArtistName.toLowerCase()).map((r) => r.track.toLowerCase())
      ).size;
      const repeatRatio = totalEvents > 0 ? topArtistCount / Math.max(1, uniqueTracksByTopArtist) : 1.0;

      // Composite Gravity Score: concentration (35%) + dominance (35%) + repeat intensity (30%)
      const concScore = Math.min(1.0, concentration / 0.38);
      const domScore = Math.min(1.0, (dominanceRatio - 1.2) / 1.8);
      const repScore = Math.min(1.0, (repeatRatio - 1.0) / 2.0);

      const artistGravityScore = Number(
        (concScore * 0.38 + domScore * 0.38 + repScore * 0.24).toFixed(2)
      );

      // Strict high threshold: must exceed 0.78
      if (artistGravityScore >= 0.78) {
        const artistObj = artists.find(
          (a) => a.name.toLowerCase() === topArtistName.toLowerCase()
        );
        const parentGenre = artistObj?.primaryGenre || records.find((r) => r.artist.toLowerCase() === topArtistName.toLowerCase())?.genre || 'Electronic';
        const celestialColor = getCelestialGenreColor(parentGenre);

        // Position slightly offset from the artist star to represent the pulling singularity
        const bhX = artistObj ? artistObj.x + 18 : 0;
        const bhY = artistObj ? artistObj.y + 18 : 0;

        blackHoles.push({
          id: `blackhole-artist-${topArtistName.toLowerCase().replace(/\s+/g, '-')}`,
          type: 'artist',
          subjectName: topArtistName,
          subjectGenre: parentGenre,
          x: bhX,
          y: bhY,
          coreRadius: 16,
          eventHorizonRadius: 26,
          accretionRadius: 46,
          gravityScore: artistGravityScore,
          pulseRate: 0.002,
          whyExplanation: `Extreme listening gravity: ${topArtistName} accounts for ${Math.round(concentration * 100)}% of your listening with repeated cyclic engagement.`,
          color: celestialColor.primary,
          celestialColor,
        });

        // Maximum one dominant singularity
        return blackHoles;
      }
    }
  }

  // 2. Analyze Genre Gravity (if no dominant artist black hole)
  const genrePlayCounts = new Map<string, number>();
  if (totalEvents > 0) {
    listeningEvents.forEach((evt) => {
      const g = evt.genre;
      genrePlayCounts.set(g, (genrePlayCounts.get(g) || 0) + 1);
    });
  } else {
    records.forEach((r) => {
      const g = r.genre;
      genrePlayCounts.set(g, (genrePlayCounts.get(g) || 0) + 1);
    });
  }

  const sortedGenres = Array.from(genrePlayCounts.entries()).sort((a, b) => b[1] - a[1]);
  if (sortedGenres.length > 0) {
    const [topGenreName, topGenreCount] = sortedGenres[0];
    const secondGenreCount = sortedGenres[1]?.[1] || 1;

    // Minimum requirement: at least 10 plays/tracks for top genre
    if (topGenreCount >= 10) {
      const genreConcentration = topGenreCount / Math.max(1, totalInteractions);
      const genreDominance = topGenreCount / Math.max(1, secondGenreCount);

      const concScore = Math.min(1.0, genreConcentration / 0.52);
      const domScore = Math.min(1.0, (genreDominance - 1.3) / 1.7);
      const genreGravityScore = Number((concScore * 0.55 + domScore * 0.45).toFixed(2));

      // Strict high threshold: must exceed 0.80
      if (genreGravityScore >= 0.80) {
        const gSys = genres.find((g) => g.name === topGenreName);
        const celestialColor = getCelestialGenreColor(topGenreName);

        const bhX = gSys ? gSys.x + gSys.radius + 36 : 200;
        const bhY = gSys ? gSys.y + 24 : 200;

        blackHoles.push({
          id: `blackhole-genre-${topGenreName.toLowerCase().replace(/\s+/g, '-')}`,
          type: 'genre',
          subjectName: topGenreName,
          subjectGenre: topGenreName,
          x: bhX,
          y: bhY,
          coreRadius: 20,
          eventHorizonRadius: 32,
          accretionRadius: 56,
          gravityScore: genreGravityScore,
          pulseRate: 0.0016,
          whyExplanation: `Territorial gravity anomaly: ${topGenreName} exerts massive sonic pull, accounting for ${Math.round(genreConcentration * 100)}% of your active library.`,
          color: celestialColor.primary,
          celestialColor,
        });

        return blackHoles;
      }
    }
  }

  // 3. Cluster Black Hole (Group of 2-3 artists creating a localized gravity pocket)
  if (sortedArtists.length >= 3) {
    const top3Count = sortedArtists[0][1] + sortedArtists[1][1] + sortedArtists[2][1];
    const clusterRatio = top3Count / Math.max(1, totalInteractions);

    if (top3Count >= 12 && clusterRatio >= 0.65) {
      const top3Names = [sortedArtists[0][0], sortedArtists[1][0], sortedArtists[2][0]];
      const matchedArtists = artists.filter((a) =>
        top3Names.some((n) => n.toLowerCase() === a.name.toLowerCase())
      );

      if (matchedArtists.length >= 2) {
        const avgX = Math.round(matchedArtists.reduce((sum, a) => sum + a.x, 0) / matchedArtists.length);
        const avgY = Math.round(matchedArtists.reduce((sum, a) => sum + a.y, 0) / matchedArtists.length);

        const clusterGravityScore = Number(Math.min(0.96, 0.78 + (clusterRatio - 0.65) * 0.5).toFixed(2));
        const celestialColor = matchedArtists[0].celestialColor || getCelestialGenreColor(matchedArtists[0].primaryGenre);

        blackHoles.push({
          id: `blackhole-cluster-${matchedArtists[0].primaryGenre.toLowerCase()}`,
          type: 'cluster',
          subjectName: top3Names.slice(0, 2).join(' & '),
          subjectGenre: matchedArtists[0].primaryGenre,
          x: avgX,
          y: avgY,
          coreRadius: 18,
          eventHorizonRadius: 28,
          accretionRadius: 50,
          gravityScore: clusterGravityScore,
          pulseRate: 0.0018,
          whyExplanation: `Listening cluster singularity: A concentrated pocket of ${top3Names.join(', ')} forms one of your strongest habitual listening domains.`,
          color: celestialColor.primary,
          celestialColor,
        });
      }
    }
  }

  return blackHoles;
}
