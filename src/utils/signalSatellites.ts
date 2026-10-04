import type {
  UniverseGenreSystem,
  UniverseArtist,
  UniverseSignalSatellite,
} from '../types';
import { getCelestialGenreColor } from './celestialColors';

/**
 * Derives sparse, meaningful signal satellites positioned along cross-system relationship lines.
 * Strictly driven by real data: cross-genre bridge artists and verified genre affinities.
 */
export function deriveSignalSatellites(
  genres: UniverseGenreSystem[],
  bridges: Array<{ artist: UniverseArtist; genreA: string; genreB: string }>,
  genreAffinities: Record<string, string[]>
): UniverseSignalSatellite[] {
  const genreMap = new Map<string, UniverseGenreSystem>();
  genres.forEach((g) => genreMap.set(g.name, g));

  const satellites: UniverseSignalSatellite[] = [];
  const processedPairs = new Set<string>();

  const getPairKey = (g1: string, g2: string) => [g1, g2].sort().join(':::');

  // 1. Primary: Satellites anchored to verified cross-genre bridge artists
  for (const bridge of bridges) {
    const pairKey = getPairKey(bridge.genreA, bridge.genreB);
    if (processedPairs.has(pairKey)) continue;

    const gA = genreMap.get(bridge.genreA);
    const gB = genreMap.get(bridge.genreB);
    if (!gA || !gB) continue;

    // Position midway along the quadratic bezier curve between gA and gB via the bridge artist
    const t = 0.5;
    const sx = (1 - t) * (1 - t) * gA.x + 2 * (1 - t) * t * bridge.artist.x + t * t * gB.x;
    const sy = (1 - t) * (1 - t) * gA.y + 2 * (1 - t) * t * bridge.artist.y + t * t * gB.y;

    const strength = Math.min(1.0, Math.max(0.55, bridge.artist.tasteImportance || 0.75));

    satellites.push({
      id: `signal-${gA.name}--${gB.name}`,
      sourceGenre: gA.name,
      targetGenre: gB.name,
      relationshipType: 'bridge_artist',
      x: Math.round(sx),
      y: Math.round(sy),
      radius: 4,
      strength,
      pulsePhase: (bridge.artist.name.length * 1.3) % (Math.PI * 2),
      bridgeArtist: bridge.artist.name,
      evidenceExplanation: `${bridge.artist.name} bridges ${gA.name} and ${gB.name} with verified multi-genre presence.`,
      sourceColor: gA.celestialColor || getCelestialGenreColor(gA.name),
      targetColor: gB.celestialColor || getCelestialGenreColor(gB.name),
    });

    processedPairs.add(pairKey);
  }

  // 2. Secondary: Satellites representing strong pairwise genre affinities
  // Only for prominent systems where both systems have at least 2 tracks
  for (const gA of genres) {
    const affinities = genreAffinities[gA.name] || [];
    for (const targetName of affinities) {
      const gB = genreMap.get(targetName);
      if (!gB) continue;

      const pairKey = getPairKey(gA.name, gB.name);
      if (processedPairs.has(pairKey)) continue;

      // Only add affinity satellites between systems with solid presence
      if (gA.trackCount < 2 || gB.trackCount < 2) continue;

      // Position at midpoint of the direct segment between the two suns
      const midX = Math.round((gA.x + gB.x) / 2);
      const midY = Math.round((gA.y + gB.y) / 2);

      satellites.push({
        id: `signal-${gA.name}--${gB.name}`,
        sourceGenre: gA.name,
        targetGenre: gB.name,
        relationshipType: 'genre_affinity',
        x: midX,
        y: midY,
        radius: 3.5,
        strength: 0.65,
        pulsePhase: ((gA.name.length + gB.name.length) * 0.7) % (Math.PI * 2),
        evidenceExplanation: `Stylistic affinity and historical harmonic convergence between ${gA.name} and ${gB.name}.`,
        sourceColor: gA.celestialColor || getCelestialGenreColor(gA.name),
        targetColor: gB.celestialColor || getCelestialGenreColor(gB.name),
      });

      processedPairs.add(pairKey);
    }
  }

  return satellites;
}
