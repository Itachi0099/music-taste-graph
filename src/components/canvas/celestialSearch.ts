import type { CelestialUniverseData } from '../../types';

export interface SearchMatchSets {
  genres: Set<string>;
  artists: Set<string>;
  tracks: Set<string>;
  discoveries: Set<string>;
}

/**
 * Computes matching entity IDs across the universe based on user query string.
 */
export function computeSearchMatches(
  universeData: CelestialUniverseData,
  searchQuery: string
): SearchMatchSets | null {
  if (!searchQuery || !searchQuery.trim()) {
    return null;
  }

  const q = searchQuery.toLowerCase().trim();
  const matchedGenres = new Set<string>();
  const matchedArtists = new Set<string>();
  const matchedTracks = new Set<string>();
  const matchedDiscoveries = new Set<string>();

  universeData.genres.forEach((g) => {
    if (g.name.toLowerCase().includes(q)) matchedGenres.add(g.id);
    g.subgenres.forEach((s) => {
      if (s.name.toLowerCase().includes(q)) matchedGenres.add(g.id);
    });
  });

  universeData.artists.forEach((a) => {
    if (a.name.toLowerCase().includes(q) || a.primaryGenre.toLowerCase().includes(q)) {
      matchedArtists.add(a.id);
      matchedGenres.add(`genre-${a.primaryGenre.toLowerCase()}`);
    }
    a.tracks.forEach((t) => {
      if (t.title.toLowerCase().includes(q) || t.album?.toLowerCase().includes(q)) {
        matchedTracks.add(t.id);
        matchedArtists.add(a.id);
        matchedGenres.add(`genre-${t.genre.toLowerCase()}`);
      }
    });
  });

  universeData.discoveries?.forEach((d) => {
    if (
      d.recommendation.artist.toLowerCase().includes(q) ||
      d.recommendation.genre.toLowerCase().includes(q) ||
      d.recommendation.subgenre?.toLowerCase().includes(q) ||
      d.recommendation.sampleTracks.some((st) => st.title.toLowerCase().includes(q))
    ) {
      matchedDiscoveries.add(d.id);
    }
  });

  return {
    genres: matchedGenres,
    artists: matchedArtists,
    tracks: matchedTracks,
    discoveries: matchedDiscoveries,
  };
}
