import type { Node, Edge } from '@xyflow/react';

// Generates an organic, clustered network layout where genres are primary cluster centers,
// artists orbit around their genre centers, and tracks orbit around their respective artists.
export const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } => {
  if (nodes.length === 0) return { nodes: [], edges: [] };

  // Group nodes by category
  const genreNodes = nodes.filter((n) => n.type === 'genreNode');
  const artistNodes = nodes.filter((n) => n.type === 'artistNode');
  const trackNodes = nodes.filter((n) => n.type === 'trackNode');

  // Map edges to find parent relations
  const artistToGenre = new Map<string, string>();
  const trackToArtist = new Map<string, string>();

  edges.forEach((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);

    if (sourceNode?.type === 'genreNode' && targetNode?.type === 'artistNode') {
      artistToGenre.set(targetNode.id, sourceNode.id);
    } else if (sourceNode?.type === 'artistNode' && targetNode?.type === 'trackNode') {
      trackToArtist.set(targetNode.id, sourceNode.id);
    }
  });

  // Fallback map from node data if edges didn't capture it directly
  artistNodes.forEach((aNode) => {
    if (!artistToGenre.has(aNode.id)) {
      const gName = (aNode.data as any)?.genre;
      if (gName) {
        const matchingGenre = genreNodes.find((g) => (g.data as any)?.label === gName);
        if (matchingGenre) artistToGenre.set(aNode.id, matchingGenre.id);
      }
    }
  });

  trackNodes.forEach((tNode) => {
    if (!trackToArtist.has(tNode.id)) {
      const aName = (tNode.data as any)?.artist;
      if (aName) {
        const matchingArtist = artistNodes.find((a) => (a.data as any)?.label === aName);
        if (matchingArtist) trackToArtist.set(tNode.id, matchingArtist.id);
      }
    }
  });

  // Calculate genre cluster centers
  // We distribute genre centers organically in a wide 2D elliptical constellation with deterministic pseudo-jitter
  const numGenres = genreNodes.length;
  const genrePositions = new Map<string, { x: number; y: number }>();

  // Determine scale based on number of genres and overall density
  // Generous cluster spacing so genres feel distinct yet part of one cohesive map
  const baseRadiusX = Math.max(520, numGenres * 95);
  const baseRadiusY = Math.max(380, numGenres * 75);

  genreNodes.forEach((gNode, idx) => {
    if (numGenres === 1) {
      genrePositions.set(gNode.id, { x: 0, y: 0 });
      return;
    }

    // Distribute angles evenly with slight organic golden-ratio perturbation
    const angle = (idx / numGenres) * 2 * Math.PI - Math.PI / 2;
    // Mild radial oscillation for an organic astronomical constellation look
    const radiusVariation = 0.88 + 0.24 * Math.sin(idx * 2.39);
    const rx = baseRadiusX * radiusVariation;
    const ry = baseRadiusY * radiusVariation;

    const gx = Math.cos(angle) * rx;
    const gy = Math.sin(angle) * ry;

    genrePositions.set(gNode.id, { x: gx, y: gy });
  });

  // Cluster artists around their respective genres
  const genreArtistsMap = new Map<string, Node[]>();
  genreNodes.forEach((g) => genreArtistsMap.set(g.id, []));

  artistNodes.forEach((aNode) => {
    const parentGenreId = artistToGenre.get(aNode.id);
    if (parentGenreId && genreArtistsMap.has(parentGenreId)) {
      genreArtistsMap.get(parentGenreId)!.push(aNode);
    } else {
      // Unassigned artist fallback: attach to first genre or center
      const firstGenreId = genreNodes[0]?.id;
      if (firstGenreId) {
        genreArtistsMap.get(firstGenreId)!.push(aNode);
      }
    }
  });

  const artistPositions = new Map<string, { x: number; y: number; angle: number }>();

  genreArtistsMap.forEach((artistsInGenre, genreId) => {
    const center = genrePositions.get(genreId) || { x: 0, y: 0 };
    const numArtists = artistsInGenre.length;

    // Direct orbital vector pointing slightly outward from global center (0,0)
    const genreAngleFromCenter = Math.atan2(center.y, center.x);

    artistsInGenre.forEach((aNode, aIdx) => {
      // Distribute artists in layered orbits (rings) around the genre
      const ringIndex = Math.floor(aIdx / 6); // 6 artists per ring
      const indexInRing = aIdx % 6;
      const countInRing = Math.min(6, numArtists - ringIndex * 6);

      // Distance from genre center
      const orbitDistance = 210 + ringIndex * 115 + (aIdx % 2 === 0 ? 20 : -20);

      // Distribute in arc around genre center facing primarily outward/neutral
      const baseSpan = Math.PI * 1.8;
      const startAngle = (genreAngleFromCenter - baseSpan / 2) + ((aIdx % 3) * 0.15);
      const angleStep = baseSpan / Math.max(1, countInRing);
      const aAngle = startAngle + indexInRing * angleStep;

      const ax = center.x + Math.cos(aAngle) * orbitDistance;
      const ay = center.y + Math.sin(aAngle) * orbitDistance;

      artistPositions.set(aNode.id, { x: ax, y: ay, angle: aAngle });
    });
  });

  // Cluster tracks around their respective artists
  const artistTracksMap = new Map<string, Node[]>();
  artistNodes.forEach((a) => artistTracksMap.set(a.id, []));

  trackNodes.forEach((tNode) => {
    const parentArtistId = trackToArtist.get(tNode.id);
    if (parentArtistId && artistTracksMap.has(parentArtistId)) {
      artistTracksMap.get(parentArtistId)!.push(tNode);
    } else {
      const firstArtistId = artistNodes[0]?.id;
      if (firstArtistId) {
        artistTracksMap.get(firstArtistId)?.push(tNode);
      }
    }
  });

  const trackPositions = new Map<string, { x: number; y: number }>();

  artistTracksMap.forEach((tracksInArtist, artistId) => {
    const aPos = artistPositions.get(artistId) || { x: 0, y: 0, angle: 0 };
    const numTracks = tracksInArtist.length;

    tracksInArtist.forEach((tNode, tIdx) => {
      // Orbital fan spreading outward from the artist away from the genre
      const trackDistance = 145 + Math.floor(tIdx / 4) * 55;
      const arcSpread = Math.PI * 0.9;
      const tAngle = aPos.angle - arcSpread / 2 + (tIdx % 4) * (arcSpread / Math.max(1, Math.min(numTracks, 4) - 1 || 1));

      const tx = aPos.x + Math.cos(tAngle) * trackDistance;
      const ty = aPos.y + Math.sin(tAngle) * trackDistance;

      trackPositions.set(tNode.id, { x: tx, y: ty });
    });
  });

  // Compile final nodes with calculated positions
  const layoutedNodes: Node[] = nodes.map((node) => {
    let pos = { x: 0, y: 0 };
    if (node.type === 'genreNode') {
      pos = genrePositions.get(node.id) || { x: 0, y: 0 };
    } else if (node.type === 'artistNode') {
      pos = artistPositions.get(node.id) || { x: 0, y: 0 };
    } else if (node.type === 'trackNode') {
      pos = trackPositions.get(node.id) || { x: 0, y: 0 };
    }

    return {
      ...node,
      position: {
        x: Math.round(pos.x),
        y: Math.round(pos.y),
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};
