import type { UniverseGenreSystem, UniverseArtist } from '../types';

export type SectorId = 'all' | 'electronic' | 'indie' | 'eclectic';

export interface SectorDefinition {
  id: SectorId;
  name: string;
  shortName: string;
  description: string;
  includedCanonicalGenres: string[];
}

export const SECTOR_DEFINITIONS: Record<SectorId, SectorDefinition> = {
  all: {
    id: 'all',
    name: 'Full Universe',
    shortName: 'Full Universe',
    description: 'The complete celestial music galaxy containing all genres, subgenres, and planetary systems.',
    includedCanonicalGenres: [],
  },
  electronic: {
    id: 'electronic',
    name: 'Electronic / Club',
    shortName: 'Electronic',
    description: 'High-energy electronic, club, techno, house, trance, and progressive stellar structures.',
    includedCanonicalGenres: [
      'Alternative Dance',
      'Breakbeat',
      'Electronic',
      'House',
      'Nu Disco',
      'Progressive House',
      'Synth-pop',
      'Techno',
      'Trance',
    ],
  },
  indie: {
    id: 'indie',
    name: 'Indie / Alternative',
    shortName: 'Indie',
    description: 'Guitar-driven alternative rock, post-punk revival, and indie pop constellations.',
    includedCanonicalGenres: [
      'Alternative Dance',
      'Alternative Rock',
      'Indie Pop',
      'Indie Rock',
      'Post-Punk Revival',
      'Synth-pop',
    ],
  },
  eclectic: {
    id: 'eclectic',
    name: 'Eclectic Mix',
    shortName: 'Eclectic',
    description: 'Expansive cross-genre territories spanning hip hop, jazz, trip hop, ambient, and R&B.',
    includedCanonicalGenres: [
      'Alternative Rock',
      'Ambient',
      'French House',
      'Hip Hop',
      'IDM',
      'Jazz',
      'R&B',
      'Synth-pop',
      'Trip Hop',
    ],
  },
};

/**
 * Validates if an identifier corresponds to a known demo sector
 */
export function isSectorId(id: string): id is SectorId {
  return id in SECTOR_DEFINITIONS;
}

/**
 * Retrieves a sector definition safely, defaulting to Full Universe
 */
export function getSector(id: string): SectorDefinition {
  if (isSectorId(id)) {
    return SECTOR_DEFINITIONS[id];
  }
  return SECTOR_DEFINITIONS.all;
}

/**
 * Computes spatial camera focus target (centroid and zoom) for a sector view
 */
export function getSectorCameraTarget(
  sectorId: SectorId | string,
  genreSystems: UniverseGenreSystem[]
): { x: number; y: number; zoom: number; destName: string } {
  if (sectorId === 'all' || !isSectorId(sectorId)) {
    return { x: 0, y: 0, zoom: 0.52, destName: 'Full Universe' };
  }

  const sector = SECTOR_DEFINITIONS[sectorId];
  const matchingGenres = genreSystems.filter((g) =>
    sector.includedCanonicalGenres.includes(g.name)
  );

  if (matchingGenres.length === 0) {
    return { x: 0, y: 0, zoom: 0.52, destName: sector.name };
  }

  const sumX = matchingGenres.reduce((acc, g) => acc + g.x, 0);
  const sumY = matchingGenres.reduce((acc, g) => acc + g.y, 0);
  const avgX = Math.round(sumX / matchingGenres.length);
  const avgY = Math.round(sumY / matchingGenres.length);

  return {
    x: avgX,
    y: avgY,
    zoom: 0.95,
    destName: `${sector.name} Sector`,
  };
}

/**
 * Checks if a canonical genre belongs to the active sector
 */
export function isGenreInSector(genreName: string, sectorId: SectorId | string): boolean {
  if (sectorId === 'all' || !isSectorId(sectorId)) {
    return true;
  }
  return SECTOR_DEFINITIONS[sectorId].includedCanonicalGenres.includes(genreName);
}

/**
 * Checks if an artist belongs to or bridges into the active sector
 */
export function isArtistInSector(artist: UniverseArtist, sectorId: SectorId | string): boolean {
  if (sectorId === 'all' || !isSectorId(sectorId)) {
    return true;
  }
  const sector = SECTOR_DEFINITIONS[sectorId];
  if (sector.includedCanonicalGenres.includes(artist.primaryGenre)) {
    return true;
  }
  if (artist.secondaryGenres?.some((g) => sector.includedCanonicalGenres.includes(g))) {
    return true;
  }
  return false;
}
