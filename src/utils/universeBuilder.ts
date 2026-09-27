import type { 
  RawTrackRecord, 
  UniverseGenreSystem, 
  UniverseArtist, 
  UniverseSubgenre, 
  UniverseTrack, 
  CelestialDiscoverySystem, 
  CelestialUniverseData,
  UniverseAsteroid,
  UniverseMeteor,
} from '../types';
import { getCelestialGenreColor } from './celestialColors';
import { generateDiscoveryRecommendations } from './discoveryEngine';

// Genre relationships and affinity matrix for organic celestial placement
// Genres with stronger musical relationships gravitate closer in the universe
const GENRE_AFFINITIES: Record<string, string[]> = {
  'Techno': ['Schranz', 'Acid Techno', 'Industrial', 'Trance', 'Breakbeat', 'House', 'Progressive House'],
  'House': ['Progressive House', 'Alternative Dance', 'Nu Disco', 'French House', 'Techno'],
  'Progressive House': ['House', 'Techno', 'Trance', 'Alternative Dance'],
  'Alternative Dance': ['House', 'Indie Pop', 'Nu Disco', 'Synth-pop', 'Post-Punk Revival'],
  'Trance': ['Techno', 'Progressive House', 'Breakbeat'],
  'Breakbeat': ['Techno', 'Trip Hop', 'IDM', 'Electronic'],
  'Nu Disco': ['House', 'French House', 'Indie Pop', 'Synth-pop'],
  'Indie Rock': ['Alternative Rock', 'Post-Punk Revival', 'Indie Pop'],
  'Alternative Rock': ['Indie Rock', 'Trip Hop', 'Electronic'],
  'Post-Punk Revival': ['Indie Rock', 'Alternative Dance', 'Synth-pop'],
  'Indie Pop': ['Indie Rock', 'Alternative Dance', 'Nu Disco', 'Synth-pop'],
  'Synth-pop': ['Alternative Dance', 'Nu Disco', 'R&B', 'French House'],
  'Hip Hop': ['Trip Hop', 'R&B', 'Jazz'],
  'Jazz': ['Hip Hop', 'Trip Hop', 'Ambient'],
  'Trip Hop': ['Hip Hop', 'Jazz', 'Ambient', 'Electronic', 'IDM'],
  'Ambient': ['IDM', 'Trip Hop', 'Jazz', 'Electronic'],
  'IDM': ['Ambient', 'Breakbeat', 'Electronic', 'Techno'],
  'French House': ['House', 'Nu Disco', 'Synth-pop'],
  'R&B': ['Hip Hop', 'Synth-pop', 'Trip Hop'],
  'Electronic': ['Techno', 'Ambient', 'IDM', 'Breakbeat'],
};

/**
 * Builds the hierarchical personal celestial universe from raw track records.
 * Follows the celestial hierarchy:
 * Universe -> Major Genres (Suns) -> Related Genres (Planets/Moons) -> Artists (Smaller Stars) -> Tracks (Orbiting Bodies)
 */
export function buildCelestialUniverse(records: RawTrackRecord[], _isDark: boolean = true): CelestialUniverseData {
  if (!records.length) {
    return { genres: [], artists: [], bridges: [], allTracks: [] };
  }

  // 1. Group records by Genre, Artist, and Subgenre
  const genreRecords = new Map<string, RawTrackRecord[]>();
  const artistRecords = new Map<string, RawTrackRecord[]>();
  const artistGenres = new Map<string, Set<string>>();

  records.forEach((rec) => {
    const genre = (rec.genre || 'Electronic').trim();
    const artist = (rec.artist || 'Unknown Artist').trim();

    if (!genreRecords.has(genre)) genreRecords.set(genre, []);
    genreRecords.get(genre)!.push(rec);

    if (!artistRecords.has(artist)) artistRecords.set(artist, []);
    artistRecords.get(artist)!.push(rec);

    if (!artistGenres.has(artist)) artistGenres.set(artist, new Set());
    artistGenres.get(artist)!.add(genre);
  });

  // Sort major genres by importance (track count)
  const sortedGenres = Array.from(genreRecords.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  const numGenres = sortedGenres.length;

  // 2. Position Major Genres organically based on mutual relationships
  // Use a celestial orbit radius from galactic core with natural organic angular placement
  const genreCenterMap = new Map<string, { 
    x: number; 
    y: number; 
    radius: number; 
    color: string;
    celestialColor: import('./celestialColors').CelestialColorIdentity;
  }>();

  // Determine galactic spread
  const galacticBaseRadius = Math.max(500, numGenres * 110);

  // Cluster genres so musically related genres (e.g. Techno & House or Ambient & IDM) are positioned adjacent
  const orderedGenres: Array<[string, RawTrackRecord[]]> = [];
  const visited = new Set<string>();

  sortedGenres.forEach(([gName]) => {
    if (visited.has(gName)) return;
    visited.add(gName);
    const item = sortedGenres.find(([n]) => n === gName);
    if (item) orderedGenres.push(item);

    // Pull closely related genres adjacent to form mutual gravitational clusters
    const affinities = GENRE_AFFINITIES[gName] || [];
    affinities.forEach((aff) => {
      const match = sortedGenres.find(([n]) => n === aff && !visited.has(n));
      if (match) {
        visited.add(match[0]);
        orderedGenres.push(match);
      }
    });
  });

  // Any remaining genres
  sortedGenres.forEach((entry) => {
    if (!visited.has(entry[0])) {
      orderedGenres.push(entry);
    }
  });

  // Compute organic angle for each major genre
  orderedGenres.forEach(([genreName, gTracks], idx) => {
    const trackCount = gTracks.length;
    // Major genre sun radius scales with library presence: 36px to 64px
    const sunRadius = Math.min(68, Math.max(34, 28 + Math.sqrt(trackCount) * 8.5));

    // Base angle around galactic center
    const angle = (idx / numGenres) * Math.PI * 2 - Math.PI / 2;

    // Subtle harmonic variation based on genre index to avoid rigid circles
    const distanceWobble = 0.86 + 0.28 * Math.sin(idx * 2.45 + 0.8);
    const dist = galacticBaseRadius * distanceWobble;

    const gx = Math.cos(angle) * dist;
    const gy = Math.sin(angle) * dist * 0.85; // Slight elliptical galaxy tilt

    const celestialColor = getCelestialGenreColor(genreName);
    const color = celestialColor.primary;

    genreCenterMap.set(genreName, { x: gx, y: gy, radius: sunRadius, color, celestialColor });
  });

  // 3. For each Major Genre, discover its secondary subgenres (planets & moons)
  const genreSystems: UniverseGenreSystem[] = [];

  sortedGenres.forEach(([genreName, gTracks]) => {
    const center = genreCenterMap.get(genreName)!;

    // Group by subgenre within this genre
    const subgenreCountMap = new Map<string, number>();
    gTracks.forEach((t) => {
      const sub = t.subgenre?.trim() || '';
      if (sub && sub.toLowerCase() !== genreName.toLowerCase()) {
        subgenreCountMap.set(sub, (subgenreCountMap.get(sub) || 0) + 1);
      }
    });

    const subgenres: UniverseSubgenre[] = [];
    const sortedSubgenres = Array.from(subgenreCountMap.entries()).sort((a, b) => b[1] - a[1]);

    sortedSubgenres.forEach(([subName, count], sIdx) => {
      // Planet vs Moon classification
      const tier: 'planet' | 'moon' = count >= 2 ? 'planet' : 'moon';
      // Distance represents relationship strength: closer = stronger relationship
      const baseDistance = tier === 'planet' ? center.radius + 75 + sIdx * 35 : center.radius + 140 + sIdx * 25;
      const subAngle = (sIdx / Math.max(1, sortedSubgenres.length)) * Math.PI * 2 + (idxGenre(genreName) * 0.5);

      subgenres.push({
        id: `subgenre-${genreName}-${subName}`,
        name: subName,
        parentGenre: genreName,
        trackCount: count,
        distance: baseDistance,
        angle: subAngle,
        x: center.x + Math.cos(subAngle) * baseDistance,
        y: center.y + Math.sin(subAngle) * baseDistance,
        tier,
        celestialColor: center.celestialColor,
      });
    });

    genreSystems.push({
      id: `genre-${genreName}`,
      name: genreName,
      trackCount: gTracks.length,
      artistCount: new Set(gTracks.map((t) => t.artist)).size,
      color: center.color,
      celestialColor: center.celestialColor,
      x: center.x,
      y: center.y,
      radius: center.radius,
      subgenres,
      artists: [], // filled in next step
    });
  });

  // 4. Build Artists (smaller stars) and position them in their genre systems or as bridges
  const universeArtists: UniverseArtist[] = [];
  const bridgeList: Array<{ artist: UniverseArtist; genreA: string; genreB: string }> = [];
  const allTracksList: UniverseTrack[] = [];

  // Map to hold artists grouped per primary genre
  const artistsByGenre = new Map<string, UniverseArtist[]>();
  genreSystems.forEach((g) => artistsByGenre.set(g.name, []));

  artistRecords.forEach((tracks, artistName) => {
    // Primary genre is the one with the most tracks by this artist
    const genreTallies: Record<string, number> = {};
    tracks.forEach((t) => {
      genreTallies[t.genre] = (genreTallies[t.genre] || 0) + 1;
    });

    const sortedArtistGenres = Object.entries(genreTallies).sort((a, b) => b[1] - a[1]);
    const primaryGenre = sortedArtistGenres[0]?.[0] || 'Electronic';
    const secondaryGenres = sortedArtistGenres.slice(1).map(([g]) => g);

    // Star radius based on track count (14px to 28px)
    const starRadius = Math.min(30, Math.max(12, 10 + Math.sqrt(tracks.length) * 5.2));

    // Check if artist is a bridge between two genres
    const isBridge = secondaryGenres.length > 0;
    const bridgeGenre = isBridge ? secondaryGenres[0] : undefined;

    // Celestial coordinates:
    const gCenter = genreCenterMap.get(primaryGenre) || { 
      x: 0, 
      y: 0, 
      radius: 40, 
      color: '#42C2F4', 
      celestialColor: getCelestialGenreColor(primaryGenre) 
    };

    let artistX = gCenter.x;
    let artistY = gCenter.y;

    if (isBridge && bridgeGenre && genreCenterMap.has(bridgeGenre)) {
      // Bridge Artist: placed in the gravitational saddle between the two genre suns!
      const g2Center = genreCenterMap.get(bridgeGenre)!;
      const midRatio = 0.5 + (Math.sin(artistName.length * 1.7) * 0.12);
      artistX = gCenter.x + (g2Center.x - gCenter.x) * midRatio;
      artistY = gCenter.y + (g2Center.y - gCenter.y) * midRatio;
    } else {
      // Orbiting around primary genre sun
      const existingInGenre = artistsByGenre.get(primaryGenre)?.length || 0;
      const orbitRing = Math.floor(existingInGenre / 5);
      const ringIdx = existingInGenre % 5;
      const orbitDist = gCenter.radius + 150 + orbitRing * 90 + (existingInGenre % 2 === 0 ? 18 : -18);
      const artAngle = (ringIdx / 5) * Math.PI * 2 + (existingInGenre * 0.35);

      artistX = gCenter.x + Math.cos(artAngle) * orbitDist;
      artistY = gCenter.y + Math.sin(artAngle) * orbitDist;
    }

    // Build orbiting tracks for this artist
    const universeTracks: UniverseTrack[] = [];
    const numTracks = tracks.length;

    tracks.forEach((t, tIdx) => {
      // Orbit radius around artist star: 35px to 80px
      const orbitDist = 32 + (tIdx % 3) * 16 + Math.floor(tIdx / 3) * 18;
      const initialAngle = (tIdx / Math.max(1, numTracks)) * Math.PI * 2;
      const orbitSpeed = 0.0004 + (0.0003 / (1 + (tIdx % 3))); // subtle gentle cosmic drift

      const trackObj: UniverseTrack = {
        id: `track-${artistName}-${t.track}-${tIdx}`.replace(/\s+/g, '-'),
        title: t.track,
        artist: artistName,
        genre: t.genre,
        subgenre: t.subgenre,
        bpm: t.bpm,
        album: t.album || 'Single',
        year: t.year || 2024,
        duration: t.duration || '4:15',
        spotifyUrl: t.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(`${artistName} ${t.track}`)}`,
        orbitRadius: orbitDist,
        orbitAngle: initialAngle,
        orbitSpeed,
        x: artistX + Math.cos(initialAngle) * orbitDist,
        y: artistY + Math.sin(initialAngle) * orbitDist,
        celestialColor: gCenter.celestialColor,
      };

      universeTracks.push(trackObj);
      allTracksList.push(trackObj);
    });

    const uniArtist: UniverseArtist = {
      id: `artist-${artistName}`.replace(/\s+/g, '-'),
      name: artistName,
      primaryGenre,
      secondaryGenres,
      trackCount: tracks.length,
      x: artistX,
      y: artistY,
      radius: starRadius,
      tracks: universeTracks,
      bridgeGenre,
      celestialColor: gCenter.celestialColor,
    };

    universeArtists.push(uniArtist);
    if (artistsByGenre.has(primaryGenre)) {
      artistsByGenre.get(primaryGenre)!.push(uniArtist);
    }

    if (isBridge && bridgeGenre) {
      bridgeList.push({ artist: uniArtist, genreA: primaryGenre, genreB: bridgeGenre });
    }
  });

  // Assign artists to their genre systems
  genreSystems.forEach((g) => {
    g.artists = artistsByGenre.get(g.name) || [];
  });

  // 5. Build Celestial Discovery Systems (Unexplored Music Systems in Universe)
  const discoveriesList = generateDiscoveryRecommendations(records);
  const celestialDiscoveries: CelestialDiscoverySystem[] = [];

  discoveriesList.forEach((rec, dIdx) => {
    // Find closest anchor genre or fallback to primary system
    let anchor = genreSystems.find((g) => g.name === rec.genre);
    if (!anchor) {
      anchor = genreSystems[0] || { x: 0, y: 0, radius: 40, color: '#C9B5DC', name: 'Electronic' };
    }

    // Distance based on similarity score & category:
    // Nearby (Taste Match ~82-95%): Closer orbit (320px - 440px from genre sun)
    // Adjacent (Taste Match ~65-81%): Medium orbit (540px - 720px from genre sun)
    // Unknown (Taste Match < 65%): Distant galactic frontier (880px - 1100px)
    let orbitDistance = 420;
    if (rec.category === 'nearby') {
      orbitDistance = anchor.radius + 280 + (dIdx % 2) * 50;
    } else if (rec.category === 'adjacent') {
      orbitDistance = anchor.radius + 560 + (dIdx % 2) * 70;
    } else {
      orbitDistance = galacticBaseRadius + 420 + dIdx * 90;
    }

    const orbitAngle = (dIdx / Math.max(1, discoveriesList.length)) * Math.PI * 2 + 0.45;
    const dx = anchor.x + Math.cos(orbitAngle) * orbitDistance;
    const dy = anchor.y + Math.sin(orbitAngle) * orbitDistance;

    const discCelestialColor = getCelestialGenreColor(rec.genre);
    const discColor = rec.category === 'nearby' 
      ? '#E0C870' // Warm discovery gold for close match
      : rec.category === 'adjacent'
      ? '#9FB8E8' // Cyan-tinted periwinkle
      : '#C49EE6'; // Deep nebula violet for unknown

    celestialDiscoveries.push({
      id: rec.id,
      recommendation: rec,
      anchorGenre: anchor.name,
      x: dx,
      y: dy,
      radius: rec.category === 'nearby' ? 17 : rec.category === 'adjacent' ? 14 : 12,
      orbitAngle,
      orbitDistance,
      color: discColor,
      celestialColor: {
        ...discCelestialColor,
        glowRgb: rec.category === 'nearby' ? '225, 200, 110' : rec.category === 'adjacent' ? '155, 185, 235' : '195, 160, 230',
        coreRgb: '255, 250, 240',
      },
    });
  });

  // 6. Build Functional Asteroids (Music Discovery & Density Objects)
  // Asteroids represent:
  // - Peripheral / obscure artists (track count = 1 or niche)
  // - High-density subgenre asteroid belts around genre systems
  // - Cross-genre bridges in the gravitational void between systems
  const asteroidsList: UniverseAsteroid[] = [];

  // Helper to generate irregular, faceted celestial silhouette vertices
  const createAsteroidVertices = (baseR: number, seed: number) => {
    const numPoints = 6 + (seed % 3); // 6 to 8 facets
    const verts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < numPoints; i++) {
      const a = (i / numPoints) * Math.PI * 2;
      const wobble = 0.72 + 0.35 * Math.sin(seed * 4.2 + i * 2.1);
      verts.push({
        x: Math.cos(a) * baseR * wobble,
        y: Math.sin(a) * baseR * wobble,
      });
    }
    return verts;
  };

  // 6A. Asteroid Belts around Major Genre Systems based on Music Density
  genreSystems.forEach((gSystem, gIdx) => {
    // Number of density asteroids proportional to genre presence
    const densityCount = Math.min(22, Math.max(6, Math.floor(gSystem.trackCount * 1.4)));
    const celestialCol = gSystem.celestialColor || getCelestialGenreColor(gSystem.name);

    for (let i = 0; i < densityCount; i++) {
      const seed = gIdx * 37 + i * 19;
      // Orbit in a belt outside the core: belt radius ~ radius * 1.6 to 2.8
      const beltDist = gSystem.radius * (1.65 + 0.9 * ((seed % 100) / 100));
      const orbitAngle = ((i / densityCount) * Math.PI * 2) + ((seed % 50) / 50) * 0.4;
      const orbitSpeed = (0.0003 + (seed % 5) * 0.0001) * (i % 2 === 0 ? 1 : -1);

      const ax = gSystem.x + Math.cos(orbitAngle) * beltDist;
      const ay = gSystem.y + Math.sin(orbitAngle) * beltDist;

      // Niche artist or peripheral subgenre representation
      const sub = gSystem.subgenres[i % Math.max(1, gSystem.subgenres.length)];
      const relatedTracks = gTracksByGenre(records, gSystem.name);
      const sampleTrack = relatedTracks[i % Math.max(1, relatedTracks.length)];

      const isLarge = i % 5 === 0;
      const isMedium = i % 3 === 0;
      const astRadius = isLarge ? 6.5 : isMedium ? 4.5 : 3.2;

      asteroidsList.push({
        id: `asteroid-belt-${gSystem.name}-${i}`,
        name: sampleTrack ? `${sampleTrack.track}` : `${gSystem.name} Fragment ${i + 1}`,
        type: isLarge ? 'obscure_artist' : isMedium ? 'niche_subgenre' : 'peripheral_track',
        parentGenre: gSystem.name,
        artist: sampleTrack?.artist || undefined,
        trackCount: isLarge ? 3 : 1,
        bpm: sampleTrack?.bpm || null,
        reasons: [
          `Atmospheric density object orbiting ${gSystem.name}`,
          sub ? `Belongs to subgenre current: ${sub.name}` : `Peripheral music fragment`,
        ],
        sampleTracks: sampleTrack ? [{ title: sampleTrack.track, album: sampleTrack.album, year: sampleTrack.year }] : undefined,
        x: ax,
        y: ay,
        baseX: gSystem.x,
        baseY: gSystem.y,
        orbitRadius: beltDist,
        orbitAngle,
        orbitSpeed,
        radius: astRadius,
        vertices: createAsteroidVertices(astRadius, seed),
        color: celestialCol.primary,
        celestialColor: celestialCol,
      });
    }
  });

  // 6B. Cross-Genre Bridge Asteroids (gravitational saddle between adjacent systems)
  bridgeList.forEach((bridge, bIdx) => {
    const gA = genreSystems.find((g) => g.name === bridge.genreA);
    const gB = genreSystems.find((g) => g.name === bridge.genreB);
    if (!gA || !gB) return;

    const count = 3;
    const bridgeCol = bridge.artist.celestialColor || getCelestialGenreColor(bridge.genreA);

    for (let k = 0; k < count; k++) {
      const tRatio = 0.25 + k * 0.25;
      const seed = bIdx * 53 + k * 29;
      const bx = gA.x + (gB.x - gA.x) * tRatio + (Math.sin(seed) * 35);
      const by = gA.y + (gB.y - gA.y) * tRatio + (Math.cos(seed) * 35);
      const astRad = 5.0;

      asteroidsList.push({
        id: `asteroid-bridge-${bridge.artist.name}-${k}`,
        name: `${bridge.artist.name} Resonance`,
        type: 'cross_genre',
        parentGenre: bridge.genreA,
        relatedGenre: bridge.genreB,
        artist: bridge.artist.name,
        trackCount: bridge.artist.trackCount,
        reasons: [
          `Cross-genre gravitational node bridging ${bridge.genreA} and ${bridge.genreB}`,
          `Anchored by mutual influences of ${bridge.artist.name}`,
        ],
        sampleTracks: bridge.artist.tracks.slice(0, 2).map((t) => ({ title: t.title, album: t.album, year: t.year })),
        x: bx,
        y: by,
        baseX: bx,
        baseY: by,
        orbitRadius: 25,
        orbitAngle: (k / count) * Math.PI * 2,
        orbitSpeed: 0.0005,
        radius: astRad,
        vertices: createAsteroidVertices(astRad, seed),
        color: bridgeCol.primary,
        celestialColor: bridgeCol,
      });
    }
  });

  // 7. Build Dynamic Meteors (Active Events moving through Universe)
  // Meteors have defined data-driven trajectories:
  // - Recommendation candidates arriving from deep space into genre systems
  // - Cross-genre bridges traveling between Genre A and Genre B
  // - Recently played tracks traveling toward their home stellar system
  const meteorsList: UniverseMeteor[] = [];
  const now = Date.now();

  // 7A. Cross-Genre Meteors (Traveling along gravitational paths between related genres)
  bridgeList.slice(0, 4).forEach((bridge, mIdx) => {
    const gA = genreSystems.find((g) => g.name === bridge.genreA);
    const gB = genreSystems.find((g) => g.name === bridge.genreB);
    if (!gA || !gB) return;

    const bridgeCol = bridge.artist.celestialColor || getCelestialGenreColor(bridge.genreA);
    const track = bridge.artist.tracks[0];

    meteorsList.push({
      id: `meteor-bridge-${bridge.artist.name}-${mIdx}`,
      title: track ? track.title : bridge.artist.name,
      artist: bridge.artist.name,
      genre: bridge.genreA,
      subgenre: bridge.genreB,
      eventType: 'cross_genre_link',
      reason: `Traveling bridge: connects ${bridge.genreA} ↔ ${bridge.genreB}`,
      sourceGenre: bridge.genreA,
      targetGenre: bridge.genreB,
      startX: gA.x,
      startY: gA.y,
      targetX: gB.x,
      targetY: gB.y,
      currentX: gA.x,
      currentY: gA.y,
      speed: 0.0016 + (mIdx % 2) * 0.0004,
      progress: (mIdx * 0.33) % 1.0, // staggered travel progress
      trailLength: 28,
      history: [],
      color: bridgeCol.primary,
      celestialColor: bridgeCol,
      createdAt: now - mIdx * 120000,
    });
  });

  // 7B. Incoming Recommendation Meteors (Moving from deep space toward discovery position)
  celestialDiscoveries.slice(0, 3).forEach((disc, dIdx) => {
    const discCol = disc.celestialColor || getCelestialGenreColor(disc.recommendation.genre);
    const angleFromFar = disc.orbitAngle + 0.8;
    const farDistance = 1400; // Far in uncharted deep space
    const startX = disc.x + Math.cos(angleFromFar) * farDistance;
    const startY = disc.y + Math.sin(angleFromFar) * farDistance;

    const sampleT = disc.recommendation.sampleTracks[0];

    meteorsList.push({
      id: `meteor-discovery-${disc.id}`,
      title: sampleT ? sampleT.title : disc.recommendation.artist,
      artist: disc.recommendation.artist,
      genre: disc.recommendation.genre,
      subgenre: disc.recommendation.subgenre,
      eventType: 'new_discovery',
      reason: `New candidate entering universe based on your ${disc.recommendation.genre} listening (${Math.round(disc.recommendation.score * 100)}% Match)`,
      sourceGenre: 'Deep Space',
      targetGenre: disc.anchorGenre,
      startX,
      startY,
      targetX: disc.x,
      targetY: disc.y,
      currentX: startX,
      currentY: startY,
      speed: 0.0012 + dIdx * 0.0003,
      progress: (0.15 + dIdx * 0.28) % 1.0,
      trailLength: 32,
      history: [],
      color: discCol.primary,
      celestialColor: discCol,
      createdAt: now - dIdx * 250000,
    });
  });

  // 7C. Recently Played Track Meteor (Entering its home system)
  if (records.length > 0) {
    const recentRec = records[0];
    const targetG = genreSystems.find((g) => g.name === recentRec.genre) || genreSystems[0];
    if (targetG) {
      const recentCol = getCelestialGenreColor(recentRec.genre);
      const offsetAngle = 1.2;
      const startX = targetG.x + Math.cos(offsetAngle) * 550;
      const startY = targetG.y + Math.sin(offsetAngle) * 550;

      meteorsList.push({
        id: `meteor-recent-${recentRec.track}`,
        title: recentRec.track,
        artist: recentRec.artist,
        genre: recentRec.genre,
        subgenre: recentRec.subgenre,
        eventType: 'recently_played',
        reason: `Recently active: entered your ${recentRec.genre} system`,
        sourceGenre: 'Listening Stream',
        targetGenre: targetG.name,
        startX,
        startY,
        targetX: targetG.x,
        targetY: targetG.y,
        currentX: startX,
        currentY: startY,
        speed: 0.002,
        progress: 0.45,
        trailLength: 26,
        history: [],
        color: recentCol.primary,
        celestialColor: recentCol,
        createdAt: now - 360000,
      });
    }
  }

  return {
    genres: genreSystems,
    artists: universeArtists,
    bridges: bridgeList,
    allTracks: allTracksList,
    discoveries: celestialDiscoveries,
    asteroids: asteroidsList,
    meteors: meteorsList,
  };
}

function gTracksByGenre(records: RawTrackRecord[], genre: string): RawTrackRecord[] {
  return records.filter((r) => (r.genre || '').toLowerCase() === genre.toLowerCase());
}

function idxGenre(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}
