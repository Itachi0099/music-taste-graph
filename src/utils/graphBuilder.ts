import type { Node, Edge } from '@xyflow/react';
import type { RawTrackRecord, GraphNodeData } from '../types';

export const buildGraphFromRecords = (records: RawTrackRecord[]) => {
  const nodes: Node<GraphNodeData>[] = [];
  const edges: Edge[] = [];

  const genreMap = new Map<string, number>(); // genre -> track count
  const artistMap = new Map<string, { genre: string; trackCount: number }>(); // artist -> { dominant genre, track count }

  // Step 1: Process records to build uniqueness maps
  records.forEach((record) => {
    // Standardize casing
    const genre = record.genre.trim();
    const artist = record.artist.trim();

    // Increment genre count
    genreMap.set(genre, (genreMap.get(genre) || 0) + 1);

    // Track artist info (assuming 1 dominant genre per artist for simplicity in MVP hierarchical tree)
    if (!artistMap.has(artist)) {
      artistMap.set(artist, { genre, trackCount: 1 });
    } else {
      const existing = artistMap.get(artist)!;
      artistMap.set(artist, { ...existing, trackCount: existing.trackCount + 1 });
    }
  });

  // Step 2: Create Genre Nodes
  genreMap.forEach((count, genre) => {
    const id = `genre-${genre}`;
    nodes.push({
      id,
      type: 'genreNode',
      position: { x: 0, y: 0 },
      data: { label: genre, count, genre },
    });
  });

  // Step 3: Create Artist Nodes and Genre->Artist Edges
  artistMap.forEach((info, artist) => {
    const id = `artist-${artist}`;
    const genreId = `genre-${info.genre}`;
    
    nodes.push({
      id,
      type: 'artistNode',
      position: { x: 0, y: 0 },
      data: { label: artist, count: info.trackCount, genre: info.genre, expanded: true },
    });

    edges.push({
      id: `edge-${genreId}-${id}`,
      source: genreId,
      target: id,
      animated: true,
      style: { stroke: '#9d4edd', strokeWidth: 2 },
    });
  });

  // Step 4: Create Track Nodes and Artist->Track Edges
  records.forEach((record, idx) => {
    // Generate a unique ID (artist and track name combination, fallback to index if duplicates exist)
    const artistId = `artist-${record.artist.trim()}`;
    const trackId = `track-${record.track.trim()}-${idx}`;

    nodes.push({
      id: trackId,
      type: 'trackNode',
      position: { x: 0, y: 0 },
      data: { 
        label: record.track.trim(), 
        bpm: record.bpm, 
        genre: record.genre.trim(), 
        artist: record.artist.trim() 
      },
      // initially hidden or visible depending on feature, let's keep them visible
    });

    edges.push({
      id: `edge-${artistId}-${trackId}`,
      source: artistId,
      target: trackId,
      type: 'default',
      style: { stroke: '#00f5d4', strokeWidth: 1, opacity: 0.5 },
    });
  });

  return { nodes, edges };
};
