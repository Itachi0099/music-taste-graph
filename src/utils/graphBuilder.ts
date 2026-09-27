import type { Node, Edge } from '@xyflow/react';
import type { RawTrackRecord, GraphNodeData } from '../types';
import { getGenreColor, getMoodForTrack } from './colors';

interface BuildGraphOptions {
  expandedGenreIds?: Set<string>;
  expandedArtistIds?: Set<string>;
  activeViewFilter?: 'all' | 'genres' | 'artists' | 'tracks';
}

export const buildGraphFromRecords = (
  records: RawTrackRecord[],
  options: BuildGraphOptions = {}
) => {
  const {
    expandedGenreIds = new Set<string>(),
    expandedArtistIds = new Set<string>(),
    activeViewFilter = 'all'
  } = options;

  const nodes: Node<GraphNodeData>[] = [];
  const edges: Edge[] = [];

  const genreMap = new Map<string, number>();
  const artistMap = new Map<string, { genre: string; trackCount: number; moods: Set<string> }>();
  const artistTracksMap = new Map<string, RawTrackRecord[]>();

  // Process raw records
  records.forEach((record) => {
    const genre = (record.genre || 'Other').trim();
    const artist = (record.artist || 'Unknown Artist').trim();
    const mood = record.mood || getMoodForTrack(genre, record.bpm);

    genreMap.set(genre, (genreMap.get(genre) || 0) + 1);

    if (!artistMap.has(artist)) {
      artistMap.set(artist, { genre, trackCount: 1, moods: new Set([mood]) });
    } else {
      const existing = artistMap.get(artist)!;
      existing.moods.add(mood);
      artistMap.set(artist, { ...existing, trackCount: existing.trackCount + 1 });
    }

    if (!artistTracksMap.has(artist)) {
      artistTracksMap.set(artist, [record]);
    } else {
      artistTracksMap.get(artist)!.push(record);
    }
  });

  // Step 1: Create Genre Nodes (cluster centers)
  // Genres are always visible unless specifically filtered strictly to tracks
  if (activeViewFilter === 'all' || activeViewFilter === 'genres' || activeViewFilter === 'artists') {
    genreMap.forEach((count, genre) => {
      const id = `genre-${genre}`;
      const colors = getGenreColor(genre);
      const isExpanded = expandedGenreIds.has(id);

      nodes.push({
        id,
        type: 'genreNode',
        position: { x: 0, y: 0 },
        data: { 
          id,
          label: genre, 
          count, 
          genre,
          color: colors.border,
          expanded: isExpanded,
        },
      });
    });
  }

  // Step 2: Create Artist Nodes
  // In the initial graph ("all" or "artists"), show all Artists around their Genres.
  // If the filter is 'genres', only show genres.
  const shouldShowArtists = activeViewFilter === 'all' || activeViewFilter === 'artists';

  if (shouldShowArtists) {
    artistMap.forEach((info, artist) => {
      const id = `artist-${artist}`;
      const genreId = `genre-${info.genre}`;
      const isArtistExpanded = expandedArtistIds.has(id);

      nodes.push({
        id,
        type: 'artistNode',
        position: { x: 0, y: 0 },
        data: { 
          id,
          label: artist, 
          count: info.trackCount, 
          genre: info.genre, 
          mood: Array.from(info.moods)[0] || 'Reflective',
          expanded: isArtistExpanded,
        },
      });

      // Subtle, low-opacity neutral line from Genre to Artist
      if (nodes.some((n) => n.id === genreId)) {
        edges.push({
          id: `edge-${genreId}-${id}`,
          source: genreId,
          target: id,
          type: 'straight',
          style: { stroke: 'var(--edge-color)', strokeWidth: 1.25, opacity: 0.5 },
        });
      }
    });
  }

  // Step 3: Create Track Nodes (Progressively revealed when an artist is expanded OR filter is 'tracks')
  artistTracksMap.forEach((tracks, artist) => {
    const artistId = `artist-${artist}`;
    const isArtistExpanded = expandedArtistIds.has(artistId);

    const shouldShowTracks = activeViewFilter === 'tracks' || isArtistExpanded;

    if (shouldShowTracks) {
      tracks.forEach((record, idx) => {
        const trackId = `track-${artist}-${record.track}-${idx}`;
        const mood = record.mood || getMoodForTrack(record.genre, record.bpm);

        nodes.push({
          id: trackId,
          type: 'trackNode',
          position: { x: 0, y: 0 },
          data: { 
            id: trackId,
            label: record.track.trim(), 
            bpm: record.bpm, 
            genre: record.genre.trim(), 
            subgenre: record.subgenre,
            artist: record.artist.trim(),
            mood,
            album: record.album,
            year: record.year,
            duration: record.duration,
            spotifyUrl: record.spotifyUrl,
          },
        });

        // Edge from Artist to Track
        if (nodes.some((n) => n.id === artistId)) {
          edges.push({
            id: `edge-${artistId}-${trackId}`,
            source: artistId,
            target: trackId,
            type: 'straight',
            style: { stroke: 'var(--edge-color)', strokeWidth: 1, opacity: 0.4 },
          });
        }
      });
    }
  });

  return { nodes, edges };
};
