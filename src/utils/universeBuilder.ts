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
  ListeningEvent,
  SpotifyPlaybackState,
} from '../types';
import { getCelestialGenreColor } from './celestialColors';
import { generateDiscoveryRecommendations } from './discoveryEngine';
import { extractTasteProfile } from './tasteProfile';

// Semantic genre relationships and affinity matrix for stable, organic spatial placement
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
 * Builds the hierarchical personal celestial universe from normalized track records,
 * listening events, and active playback state.
 */
export function buildCelestialUniverse(
  records: RawTrackRecord[],
  _isDark: boolean = true,
  listeningEvents?: ListeningEvent[],
  playbackState?: SpotifyPlaybackState | null
): CelestialUniverseData {
  if (!records.length) {
    return { genres: [], artists: [], bridges: [], allTracks: [] };
  }

  const tasteProfile = extractTasteProfile(records);

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

  // Sort major genres deterministically by importance / track count
  const sortedGenres = Array.from(genreRecords.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  const numGenres = sortedGenres.length;

  // 2. Position Major Genres with stable spatial layout
  // Deterministic clustering so related genres remain adjacent across renders
  const genreCenterMap = new Map<string, { 
    x: number; 
    y: number; 
    radius: number; 
    color: string;
    celestialColor: import('./celestialColors').CelestialColorIdentity;
    activityLevel: number;
    brightness: number;
  }>();

  const galacticBaseRadius = Math.max(500, numGenres * 110);

  const orderedGenres: Array<[string, RawTrackRecord[]]> = [];
  const visited = new Set<string>();

  sortedGenres.forEach(([gName]) => {
    if (visited.has(gName)) return;
    visited.add(gName);
    const item = sortedGenres.find(([n]) => n === gName);
    if (item) orderedGenres.push(item);

    const affinities = GENRE_AFFINITIES[gName] || [];
    affinities.forEach((aff) => {
      const match = sortedGenres.find(([n]) => n === aff && !visited.has(n));
      if (match) {
        visited.add(match[0]);
        orderedGenres.push(match);
      }
    });
  });

  sortedGenres.forEach((entry) => {
    if (!visited.has(entry[0])) {
      orderedGenres.push(entry);
    }
  });

  // Check which genres have active listening events recently
  const recentGenreActivity = new Map<string, number>();
  if (listeningEvents && listeningEvents.length > 0) {
    listeningEvents.slice(0, 15).forEach((evt, idx) => {
      const g = evt.genre;
      const weight = 1.0 - idx * 0.06;
      recentGenreActivity.set(g, (recentGenreActivity.get(g) || 0) + weight);
    });
  }

  // Active playback boost
  if (playbackState?.isPlaying && playbackState.artistName) {
    const currentArtist = playbackState.artistName.toLowerCase();
    for (const [artistName, genres] of artistGenres.entries()) {
      if (artistName.toLowerCase() === currentArtist) {
        genres.forEach((g) => {
          recentGenreActivity.set(g, (recentGenreActivity.get(g) || 0) + 2.5);
        });
      }
    }
  }

  // Compute stable position and dynamic activity for each major genre
  orderedGenres.forEach(([genreName, gTracks], idx) => {
    const trackCount = gTracks.length;
    // Scale sun radius with genre presence
    const sunRadius = Math.min(68, Math.max(34, 28 + Math.sqrt(trackCount) * 8.5));

    // Base angle around galactic center
    const angle = (idx / numGenres) * Math.PI * 2 - Math.PI / 2;

    const distanceWobble = 0.86 + 0.28 * Math.sin(idx * 2.45 + 0.8);
    const dist = galacticBaseRadius * distanceWobble;

    const gx = Math.cos(angle) * dist;
    const gy = Math.sin(angle) * dist * 0.85;

    const celestialColor = getCelestialGenreColor(genreName);
    const color = celestialColor.primary;

    const rawActivity = recentGenreActivity.get(genreName) || 0;
    const activityLevel = Number(Math.min(1.0, rawActivity * 0.3).toFixed(2));
    const brightness = 1.0 + activityLevel * 0.45;

    genreCenterMap.set(genreName, { 
      x: gx, 
      y: gy, 
      radius: sunRadius, 
      color, 
      celestialColor,
      activityLevel,
      brightness,
    });
  });

  // 3. For each Major Genre, discover its secondary subgenres (planets & moons)
  const genreSystems: UniverseGenreSystem[] = [];

  sortedGenres.forEach(([genreName, gTracks]) => {
    const center = genreCenterMap.get(genreName)!;

    const subgenreCountMap = new Map<string, number>();
    gTracks.forEach((t) => {
      const sub = t.subgenre?.trim() || '';
      if (sub && sub.toLowerCase() !== genreName.toLowerCase()) {
        subgenreCountMap.set(sub, (subgenreCountMap.get(sub) || 0) + 1);
      }
    });

    const sortedSubs = Array.from(subgenreCountMap.entries()).sort((a, b) => b[1] - a[1]);
    const subgenres: UniverseSubgenre[] = [];

    sortedSubs.forEach(([subName, sCount], sIdx) => {
      const isPlanet = sCount >= 2;
      const angle = (sIdx / Math.max(1, sortedSubs.length)) * Math.PI * 2 + 0.35;
      const distance = center.radius + 45 + sIdx * 24;

      subgenres.push({
        id: `subgenre-${genreName}-${subName}`,
        name: subName,
        parentGenre: genreName,
        trackCount: sCount,
        distance,
        angle,
        x: center.x + Math.cos(angle) * distance,
        y: center.y + Math.sin(angle) * distance,
        tier: isPlanet ? 'planet' : 'moon',
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
      activityLevel: center.activityLevel,
      brightness: center.brightness,
      subgenres,
      artists: [],
    });
  });

  // 4. Position Artists (Stars)
  const universeArtists: UniverseArtist[] = [];
  const allTracksList: UniverseTrack[] = [];
  const bridgeList: Array<{ artist: UniverseArtist; genreA: string; genreB: string }> = [];

  const currentlyPlayingArtistLower = (playbackState?.isPlaying && playbackState.artistName)
    ? playbackState.artistName.toLowerCase()
    : null;
  const currentlyPlayingTrackLower = (playbackState?.isPlaying && playbackState.trackTitle)
    ? playbackState.trackTitle.toLowerCase()
    : null;

  artistRecords.forEach((aTracks, artistName) => {
    const genres = Array.from(artistGenres.get(artistName) || []);
    const primaryGenre = genres[0] || 'Electronic';
    const secondaryGenres = genres.slice(1);

    const isBridge = genres.length >= 2;
    const parentSystem = genreCenterMap.get(primaryGenre) || genreCenterMap.get(genreSystems[0].name)!;

    const trackCount = aTracks.length;
    const artistRadius = Math.min(18, Math.max(8.5, 7 + Math.sqrt(trackCount) * 2.8));

    let ax: number;
    let ay: number;
    let bridgeGenre: string | undefined;

    if (isBridge && genreCenterMap.has(genres[1])) {
      const gB = genreCenterMap.get(genres[1])!;
      bridgeGenre = genres[1];
      const saddleT = 0.5 + 0.15 * Math.sin(artistName.length);
      ax = parentSystem.x + (gB.x - parentSystem.x) * saddleT + Math.sin(artistName.length * 2.1) * 35;
      ay = parentSystem.y + (gB.y - parentSystem.y) * saddleT + Math.cos(artistName.length * 2.1) * 35;
    } else {
      const hash = idxGenre(artistName);
      const angle = (hash / 100) * Math.PI * 2;
      const orbitOffset = parentSystem.radius + 85 + (hash % 120);
      ax = parentSystem.x + Math.cos(angle) * orbitOffset;
      ay = parentSystem.y + Math.sin(angle) * orbitOffset;
    }

    const isCurrentlyPlaying = currentlyPlayingArtistLower ? artistName.toLowerCase() === currentlyPlayingArtistLower : false;

    // Artists tracks as satellites
    const artistTracks: UniverseTrack[] = aTracks.map((t, tIdx) => {
      const orbitRadius = artistRadius + 14 + tIdx * 9.5;
      const orbitAngle = (tIdx / Math.max(1, aTracks.length)) * Math.PI * 2 + 0.5;
      const orbitSpeed = 0.0004 + (tIdx % 3) * 0.0002;
      const tx = ax + Math.cos(orbitAngle) * orbitRadius;
      const ty = ay + Math.sin(orbitAngle) * orbitRadius;

      const isTrackPlaying = isCurrentlyPlaying && currentlyPlayingTrackLower
        ? t.track.toLowerCase().includes(currentlyPlayingTrackLower) || currentlyPlayingTrackLower.includes(t.track.toLowerCase())
        : false;

      const trackObj: UniverseTrack = {
        id: `track-${t.track.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${tIdx}`,
        title: t.track,
        artist: t.artist,
        genre: t.genre,
        subgenre: t.subgenre,
        bpm: t.bpm,
        duration: t.duration,
        album: t.album,
        year: t.year,
        orbitRadius,
        orbitAngle,
        orbitSpeed,
        x: tx,
        y: ty,
        spotifyUrl: t.spotifyUrl,
        celestialColor: parentSystem.celestialColor,
        isCurrentlyPlaying: isTrackPlaying,
      };

      allTracksList.push(trackObj);
      return trackObj;
    });

    const artistObj: UniverseArtist = {
      id: `artist-${artistName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: artistName,
      primaryGenre,
      secondaryGenres,
      trackCount,
      x: ax,
      y: ay,
      radius: artistRadius,
      tracks: artistTracks,
      bridgeGenre,
      celestialColor: parentSystem.celestialColor,
      isCurrentlyPlaying,
    };

    universeArtists.push(artistObj);

    if (isBridge && bridgeGenre) {
      bridgeList.push({ artist: artistObj, genreA: primaryGenre, genreB: bridgeGenre });
    }

    const gSys = genreSystems.find((g) => g.name === primaryGenre);
    if (gSys) gSys.artists.push(artistObj);
  });

  // 5. Generate Discovery Systems (Stellar Nurseries in Deep Space)
  const discoveries = generateDiscoveryRecommendations(records, 'all', tasteProfile);
  const celestialDiscoveries: CelestialDiscoverySystem[] = [];

  discoveries.forEach((rec, dIdx) => {
    let anchor = genreSystems.find((g) => g.name.toLowerCase() === rec.genre.toLowerCase());
    if (!anchor) {
      anchor = genreSystems[dIdx % genreSystems.length];
    }
    if (!anchor) return;

    const baseDistance = anchor.radius + 260;
    const distanceFactor = rec.category === 'nearby' ? 1.0 : rec.category === 'adjacent' ? 1.6 : 2.3;
    const orbitDistance = baseDistance * distanceFactor;

    const hash = idxGenre(rec.artist);
    const orbitAngle = (hash / 100) * Math.PI * 2;

    const dx = anchor.x + Math.cos(orbitAngle) * orbitDistance;
    const dy = anchor.y + Math.sin(orbitAngle) * orbitDistance;

    const discCelestialColor = getCelestialGenreColor(rec.genre);
    const discColor = discCelestialColor.primary;

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

  // 6. Build Functional Asteroids (Music Density & Peripheral Relationships)
  const asteroidsList: UniverseAsteroid[] = [];

  const createAsteroidVertices = (baseR: number, seed: number) => {
    const numPoints = 6 + (seed % 3);
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
    const densityCount = Math.min(22, Math.max(6, Math.floor(gSystem.trackCount * 1.4)));
    const celestialCol = gSystem.celestialColor || getCelestialGenreColor(gSystem.name);

    for (let i = 0; i < densityCount; i++) {
      const seed = gIdx * 37 + i * 19;
      const beltDist = gSystem.radius * (1.65 + 0.9 * ((seed % 100) / 100));
      const orbitAngle = ((i / densityCount) * Math.PI * 2) + ((seed % 50) / 50) * 0.4;
      const orbitSpeed = (0.0003 + (seed % 5) * 0.0001) * (i % 2 === 0 ? 1 : -1);

      const ax = gSystem.x + Math.cos(orbitAngle) * beltDist;
      const ay = gSystem.y + Math.sin(orbitAngle) * beltDist;

      const sub = gSystem.subgenres[i % Math.max(1, gSystem.subgenres.length)];
      const relatedTracks = gTracksByGenre(records, gSystem.name);
      const sampleTrack = relatedTracks[i % Math.max(1, relatedTracks.length)];

      const isLarge = i % 5 === 0;
      const isMedium = i % 3 === 0;
      const astRadius = isLarge ? 6.5 : isMedium ? 4.5 : 3.2;

      asteroidsList.push({
        id: `asteroid-belt-${gSystem.name}-${i}`,
        name: sampleTrack ? `${sampleTrack.track}` : `${gSystem.name} Peripheral ${i + 1}`,
        type: isLarge ? 'obscure_artist' : isMedium ? 'niche_subgenre' : 'peripheral_track',
        parentGenre: gSystem.name,
        artist: sampleTrack?.artist || undefined,
        trackCount: isLarge ? 3 : 1,
        bpm: sampleTrack?.bpm || null,
        reasons: [
          `Atmospheric density object orbiting ${gSystem.name}`,
          sub ? `Subgenre current: ${sub.name}` : `Peripheral library track`,
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
      const bx = gA.x + (gB.x - gA.x) * tRatio + Math.sin(bIdx * 3 + k) * 35;
      const by = gA.y + (gB.y - gA.y) * tRatio + Math.cos(bIdx * 3 + k) * 35;
      const astRad = 4.2;

      asteroidsList.push({
        id: `asteroid-bridge-${bridge.artist.name}-${k}`,
        name: `${bridge.artist.name} Bridge Object ${k + 1}`,
        type: 'cross_genre',
        parentGenre: bridge.genreA,
        relatedGenre: bridge.genreB,
        artist: bridge.artist.name,
        trackCount: 1,
        reasons: [
          `Gravitational saddle between ${bridge.genreA} and ${bridge.genreB}`,
          `Anchored by cross-genre artist ${bridge.artist.name}`,
        ],
        sampleTracks: bridge.artist.tracks.map((t) => ({ title: t.title, album: t.album, year: t.year })),
        x: bx,
        y: by,
        baseX: bx,
        baseY: by,
        orbitRadius: 20,
        orbitAngle: k * 1.5,
        orbitSpeed: 0.0002,
        radius: astRad,
        vertices: createAsteroidVertices(astRad, bIdx * 20 + k),
        color: bridgeCol.primary,
        celestialColor: bridgeCol,
      });
    }
  });

  // 7. Data-Driven Meteors (Genuine Active Data Events)
  const meteorsList: UniverseMeteor[] = [];
  const now = Date.now();

  // 7A. Real Listening Events as Active Meteors
  if (listeningEvents && listeningEvents.length > 0) {
    listeningEvents.slice(0, 4).forEach((evt, eIdx) => {
      const targetG = genreSystems.find((g) => g.name.toLowerCase() === evt.genre.toLowerCase()) || genreSystems[0];
      if (targetG) {
        const col = getCelestialGenreColor(evt.genre);
        const angle = (eIdx * 1.4) + 0.5;
        const startX = targetG.x + Math.cos(angle) * 580;
        const startY = targetG.y + Math.sin(angle) * 580;

        meteorsList.push({
          id: `meteor-live-evt-${evt.id}`,
          title: evt.trackTitle,
          artist: evt.artistName,
          genre: evt.genre,
          subgenre: evt.subgenre,
          eventType: 'recently_played',
          reason: `Active listening event: entered your ${evt.genre} stellar system`,
          sourceGenre: 'Listening Stream',
          targetGenre: targetG.name,
          startX,
          startY,
          targetX: targetG.x,
          targetY: targetG.y,
          currentX: startX,
          currentY: startY,
          speed: 0.0022 + eIdx * 0.0003,
          progress: (0.2 + eIdx * 0.25) % 1.0,
          trailLength: 28,
          history: [],
          color: col.primary,
          celestialColor: col,
          createdAt: new Date(evt.playedAt).getTime() || now,
        });
      }
    });
  } else if (records.length > 0) {
    // Fallback: 1 recent track from records
    const recentRec = records[0];
    const targetG = genreSystems.find((g) => g.name === recentRec.genre) || genreSystems[0];
    if (targetG) {
      const recentCol = getCelestialGenreColor(recentRec.genre);
      const startX = targetG.x + Math.cos(1.2) * 520;
      const startY = targetG.y + Math.sin(1.2) * 520;

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
        createdAt: now - 180000,
      });
    }
  }

  // 7B. Incoming Recommendation Meteors (From deep space toward discovery position)
  celestialDiscoveries.slice(0, 2).forEach((disc, dIdx) => {
    const discCol = disc.celestialColor || getCelestialGenreColor(disc.recommendation.genre);
    const angleFromFar = disc.orbitAngle + 0.8;
    const farDistance = 1200;
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
      speed: 0.0014 + dIdx * 0.0003,
      progress: (0.15 + dIdx * 0.35) % 1.0,
      trailLength: 30,
      history: [],
      color: discCol.primary,
      celestialColor: discCol,
      createdAt: now - dIdx * 200000,
    });
  });

  // 7C. Cross-genre bridge meteor
  if (bridgeList.length > 0) {
    const bridge = bridgeList[0];
    const gA = genreSystems.find((g) => g.name === bridge.genreA);
    const gB = genreSystems.find((g) => g.name === bridge.genreB);
    if (gA && gB) {
      const bridgeCol = bridge.artist.celestialColor || getCelestialGenreColor(bridge.genreA);
      meteorsList.push({
        id: `meteor-bridge-${bridge.artist.name}`,
        title: bridge.artist.tracks[0]?.title || bridge.artist.name,
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
        speed: 0.0018,
        progress: 0.65,
        trailLength: 26,
        history: [],
        color: bridgeCol.primary,
        celestialColor: bridgeCol,
        createdAt: now - 120000,
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
