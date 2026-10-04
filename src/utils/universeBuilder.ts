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
  'R&B': ['Hip Hop', 'Synth-pop', 'Trip Hop', 'Pop', 'Soul'],
  'Electronic': ['Techno', 'Ambient', 'IDM', 'Breakbeat', 'Trance', 'Psytrance'],
  'Psytrance': ['Trance', 'Techno', 'Breakbeat', 'Electronic', 'Ambient'],
  'Rock': ['Alternative Rock', 'Indie Rock', 'Post-Punk Revival', 'Metal', 'Blues'],
  'Metal': ['Rock', 'Alternative Rock', 'Post-Punk Revival'],
  'Pop': ['Indie Pop', 'Synth-pop', 'Nu Disco', 'R&B', 'Dance'],
  'Country': ['Folk', 'Blues', 'Rock', 'Americana'],
  'Folk': ['Country', 'Indie Rock', 'Americana', 'Rock'],
  'Classical': ['Ambient', 'IDM', 'Modern Classical'],
  'Reggae': ['Trip Hop', 'Hip Hop', 'Dub'],
  'Latin': ['Pop', 'Hip Hop', 'R&B'],
  'Blues': ['Jazz', 'Rock', 'R&B', 'Country'],
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
    const genre = (rec.genre || 'Unknown').trim();
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


  // 4. Position Artists (Planetary Bodies Orbiting Genre/Subgenre Systems)
  const universeArtists: UniverseArtist[] = [];
  const allTracksList: UniverseTrack[] = [];
  const bridgeList: Array<{ artist: UniverseArtist; genreA: string; genreB: string }> = [];

  const currentlyPlayingArtistLower = (playbackState?.isPlaying && playbackState.artistName)
    ? playbackState.artistName.toLowerCase()
    : null;
  const currentlyPlayingTrackLower = (playbackState?.isPlaying && playbackState.trackTitle)
    ? playbackState.trackTitle.toLowerCase()
    : null;

  // Track recency factor for each artist and track from listening events and playback
  const recentArtistActivity = new Map<string, number>();
  const recentTrackActivity = new Map<string, number>();
  if (listeningEvents && listeningEvents.length > 0) {
    listeningEvents.slice(0, 30).forEach((evt, idx) => {
      const a = evt.artistName.toLowerCase();
      const weight = Math.max(0.15, 1.0 - idx * 0.035);
      recentArtistActivity.set(a, Math.max(recentArtistActivity.get(a) || 0, weight));

      const tKey = `${a}:::${evt.trackTitle.toLowerCase()}`;
      recentTrackActivity.set(tKey, Math.max(recentTrackActivity.get(tKey) || 0, weight));
    });
  }
  if (playbackState?.isPlaying && playbackState.artistName) {
    const a = playbackState.artistName.toLowerCase();
    recentArtistActivity.set(a, 1.6);
    if (playbackState.trackTitle) {
      recentTrackActivity.set(`${a}:::${playbackState.trackTitle.toLowerCase()}`, 2.0);
    }
  }

  // Group artists by whether they are cross-genre bridges or belong primarily to a genre system
  interface ArtistMeta {
    artistName: string;
    aTracks: RawTrackRecord[];
    genres: string[];
    primaryGenre: string;
    secondaryGenres: string[];
    isBridge: boolean;
    bridgeGenre?: string;
    dominantSubgenre?: string;
    tasteImportance: number;
    artistRadius: number;
    recencyFactor: number;
    isCurrentlyPlaying: boolean;
    relationshipScore: number; // 0 (peripheral) to 1 (core)
  }

  const artistMetaList: ArtistMeta[] = [];

  artistRecords.forEach((aTracks, artistName) => {
    const genres = Array.from(artistGenres.get(artistName) || []);
    const primaryGenre = genres[0] || 'Unknown';
    const secondaryGenres = genres.slice(1);
    const isBridge = genres.length >= 2 && genreCenterMap.has(genres[1]);
    const bridgeGenre = isBridge ? genres[1] : undefined;

    // Dominant subgenre for this artist within primary genre
    const subCounts = new Map<string, number>();
    aTracks.forEach((t) => {
      const sub = t.subgenre?.trim();
      if (sub && sub.toLowerCase() !== primaryGenre.toLowerCase()) {
        subCounts.set(sub, (subCounts.get(sub) || 0) + 1);
      }
    });
    const sortedSubCounts = Array.from(subCounts.entries()).sort((a, b) => b[1] - a[1]);
    const dominantSubgenre = sortedSubCounts.length > 0 ? sortedSubCounts[0][0] : undefined;

    // Recency & currently playing
    const recencyFactor = recentArtistActivity.get(artistName.toLowerCase()) || 0;
    const isCurrentlyPlaying = currentlyPlayingArtistLower ? artistName.toLowerCase() === currentlyPlayingArtistLower : false;

    // Artist size derived from relative importance in user taste
    const affinity = tasteProfile.artistAffinity[artistName] ?? Math.min(1, aTracks.length / 5);
    const trackCount = aTracks.length;
    const tasteImportance = Math.min(1.0, Math.max(0.08, affinity * 0.82 + (recencyFactor > 0 ? 0.18 : 0)));
    // Size scales from 8.5 to 21px based on taste importance
    const artistRadius = Math.min(21, Math.max(8.5, 8.5 + tasteImportance * 10.5 + Math.min(2.5, Math.sqrt(trackCount) * 0.65)));

    // Relationship to primary genre
    const genreTracksCount = aTracks.filter((t) => (t.genre || '').toLowerCase() === primaryGenre.toLowerCase()).length;
    const exclusivity = genreTracksCount / Math.max(1, aTracks.length);
    const parentSys = genreSystems.find((g) => g.name === primaryGenre);
    const genreShare = genreTracksCount / Math.max(1, parentSys?.trackCount || 1);
    const relationshipScore = exclusivity * 0.6 + Math.min(1, genreShare * 3) * 0.4;

    artistMetaList.push({
      artistName,
      aTracks,
      genres,
      primaryGenre,
      secondaryGenres,
      isBridge,
      bridgeGenre,
      dominantSubgenre,
      tasteImportance,
      artistRadius,
      recencyFactor,
      isCurrentlyPlaying,
      relationshipScore,
    });
  });

  // Calculate planetary orbits per genre system for non-bridge artists
  const genreArtistMap = new Map<string, ArtistMeta[]>();
  const bridgeMetaList: ArtistMeta[] = [];

  artistMetaList.forEach((meta) => {
    if (meta.isBridge) {
      bridgeMetaList.push(meta);
    } else {
      if (!genreArtistMap.has(meta.primaryGenre)) genreArtistMap.set(meta.primaryGenre, []);
      genreArtistMap.get(meta.primaryGenre)!.push(meta);
    }
  });

  // Position genre-bound artists in clean, distinct planetary orbital shells around their genre/subgenre
  genreArtistMap.forEach((metaGroup, gName) => {
    const parentSystem = genreCenterMap.get(gName) || genreCenterMap.get(genreSystems[0]?.name || '');
    if (!parentSystem) return;

    // Find subgenre objects in this genre system
    const gSys = genreSystems.find((g) => g.name === gName);

    // Sort artists in this genre system by relationship score (core artists first)
    // so core artists receive inner orbital shells and peripheral/subgenre artists receive outer shells
    metaGroup.sort((a, b) => b.relationshipScore - a.relationshipScore);

    const numArtists = metaGroup.length;
    const baseInnerRadius = parentSystem.radius + 50;
    const orbitStep = Math.max(18, Math.min(28, 140 / Math.max(1, numArtists)));

    metaGroup.forEach((meta, aIdx) => {
      const matchingSub = meta.dominantSubgenre && gSys
        ? gSys.subgenres.find((s) => s.name.toLowerCase() === meta.dominantSubgenre!.toLowerCase())
        : undefined;

      // Orbital radius represents relationship/distance from genre
      let orbitRadius: number;
      if (matchingSub) {
        // Aligned with the subgenre's orbital distance from the genre center
        orbitRadius = matchingSub.distance + (aIdx % 3 - 1) * 8;
      } else {
        // Distance based on relationship score with non-overlapping concentric spacing
        orbitRadius = baseInnerRadius + aIdx * orbitStep + (1.0 - meta.relationshipScore) * 15;
      }

      const hash = idxGenre(meta.artistName);
      // Angle distributed around the star, harmonized with subgenre if present
      let initialAngle: number;
      if (matchingSub) {
        initialAngle = matchingSub.angle + ((hash % 16 - 8) / 100) * Math.PI;
      } else {
        initialAngle = (aIdx / Math.max(1, numArtists)) * Math.PI * 2 + (hash % 10) * 0.05;
      }

      // Orbital velocity driven by distance and listening activity/recency
      const distanceFactor = Math.sqrt(95 / Math.max(50, orbitRadius));
      const activityFactor = 1.0 + meta.recencyFactor * 0.85 + (meta.isCurrentlyPlaying ? 0.75 : 0.0);
      const orbitSpeed = 0.0016 * distanceFactor * activityFactor;

      const ax = parentSystem.x + Math.cos(initialAngle) * orbitRadius;
      const ay = parentSystem.y + Math.sin(initialAngle) * orbitRadius;

      // Artists tracks as satellites (moons) around the artist planet
      const artistTracks: UniverseTrack[] = meta.aTracks.map((t, tIdx) => {
        const tOrbitRadius = meta.artistRadius + 14 + tIdx * 9.5;
        const tOrbitAngle = (tIdx / Math.max(1, meta.aTracks.length)) * Math.PI * 2 + 0.5;
        const tOrbitSpeed = 0.0035 + (tIdx % 3) * 0.0012;
        const tx = ax + Math.cos(tOrbitAngle) * tOrbitRadius;
        const ty = ay + Math.sin(tOrbitAngle) * tOrbitRadius;

        const isTrackPlaying = meta.isCurrentlyPlaying && currentlyPlayingTrackLower
          ? t.track.toLowerCase().includes(currentlyPlayingTrackLower) || currentlyPlayingTrackLower.includes(t.track.toLowerCase())
          : false;

        const tRecency = recentTrackActivity.get(`${meta.artistName.toLowerCase()}:::${t.track.toLowerCase()}`) || (isTrackPlaying ? 1.5 : 0);

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
          orbitRadius: tOrbitRadius,
          orbitAngle: tOrbitAngle,
          orbitSpeed: tOrbitSpeed,
          x: tx,
          y: ty,
          spotifyUrl: t.spotifyUrl,
          celestialColor: parentSystem.celestialColor,
          isCurrentlyPlaying: isTrackPlaying,
          isRecentlyPlayed: tRecency > 0,
          recencyFactor: tRecency,
        };

        allTracksList.push(trackObj);
        return trackObj;
      });

      const artistObj: UniverseArtist = {
        id: `artist-${meta.artistName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: meta.artistName,
        primaryGenre: meta.primaryGenre,
        secondaryGenres: meta.secondaryGenres,
        trackCount: meta.aTracks.length,
        x: ax,
        y: ay,
        radius: meta.artistRadius,
        tracks: artistTracks,
        celestialColor: parentSystem.celestialColor,
        isCurrentlyPlaying: meta.isCurrentlyPlaying,
        orbitRadius,
        orbitAngle: initialAngle,
        orbitSpeed,
        baseX: parentSystem.x,
        baseY: parentSystem.y,
        parentSubgenre: meta.dominantSubgenre,
        tasteImportance: meta.tasteImportance,
        recencyFactor: meta.recencyFactor,
        isBridge: false,
      };

      universeArtists.push(artistObj);
      if (gSys) gSys.artists.push(artistObj);
    });
  });

  // Position cross-genre bridge artists with a meaningful cross-system relationship
  bridgeMetaList.forEach((meta) => {
    const gA = genreCenterMap.get(meta.primaryGenre) || genreCenterMap.get(genreSystems[0]?.name || '')!;
    const gB = genreCenterMap.get(meta.bridgeGenre!) || gA;

    const dx = gB.x - gA.x;
    const dy = gB.y - gA.y;
    const bridgeDist = Math.hypot(dx, dy) || 1;
    const axisX = dx / bridgeDist;
    const axisY = dy / bridgeDist;
    const perpX = -axisY;
    const perpY = axisX;

    const saddleT = 0.5 + 0.12 * Math.sin(meta.artistName.length * 1.7);
    const midX = gA.x + dx * saddleT;
    const midY = gA.y + dy * saddleT;
    const basePerpOffset = Math.sin(meta.artistName.length * 2.1) * 35;

    const saddleX = midX + perpX * basePerpOffset;
    const saddleY = midY + perpY * basePerpOffset;

    const semiMajor = Math.min(65, Math.max(25, bridgeDist * 0.08));
    const semiMinor = Math.min(35, Math.max(16, bridgeDist * 0.04));
    const initialAngle = (idxGenre(meta.artistName) / 100) * Math.PI * 2;

    const activityFactor = 1.0 + meta.recencyFactor * 0.85 + (meta.isCurrentlyPlaying ? 0.75 : 0.0);
    const bridgeSpeed = 0.0014 * activityFactor;

    const ax = saddleX + axisX * Math.cos(initialAngle) * semiMajor + perpX * Math.sin(initialAngle) * semiMinor;
    const ay = saddleY + axisY * Math.cos(initialAngle) * semiMajor + perpY * Math.sin(initialAngle) * semiMinor;
    const orbitRadius = Math.hypot(ax - gA.x, ay - gA.y);

    const artistTracks: UniverseTrack[] = meta.aTracks.map((t, tIdx) => {
      const tOrbitRadius = meta.artistRadius + 14 + tIdx * 9.5;
      const tOrbitAngle = (tIdx / Math.max(1, meta.aTracks.length)) * Math.PI * 2 + 0.5;
      const tOrbitSpeed = 0.0004 + (tIdx % 3) * 0.0002;
      const tx = ax + Math.cos(tOrbitAngle) * tOrbitRadius;
      const ty = ay + Math.sin(tOrbitAngle) * tOrbitRadius;

      const isTrackPlaying = meta.isCurrentlyPlaying && currentlyPlayingTrackLower
        ? t.track.toLowerCase().includes(currentlyPlayingTrackLower) || currentlyPlayingTrackLower.includes(t.track.toLowerCase())
        : false;

      const tRecency = recentTrackActivity.get(`${meta.artistName.toLowerCase()}:::${t.track.toLowerCase()}`) || (isTrackPlaying ? 1.5 : 0);

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
        orbitRadius: tOrbitRadius,
        orbitAngle: tOrbitAngle,
        orbitSpeed: tOrbitSpeed,
        x: tx,
        y: ty,
        spotifyUrl: t.spotifyUrl,
        celestialColor: gA.celestialColor,
        isCurrentlyPlaying: isTrackPlaying,
        isRecentlyPlayed: tRecency > 0,
        recencyFactor: tRecency,
      };

      allTracksList.push(trackObj);
      return trackObj;
    });

    const artistObj: UniverseArtist = {
      id: `artist-${meta.artistName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: meta.artistName,
      primaryGenre: meta.primaryGenre,
      secondaryGenres: meta.secondaryGenres,
      trackCount: meta.aTracks.length,
      x: ax,
      y: ay,
      radius: meta.artistRadius,
      tracks: artistTracks,
      bridgeGenre: meta.bridgeGenre,
      celestialColor: gA.celestialColor,
      isCurrentlyPlaying: meta.isCurrentlyPlaying,
      orbitRadius,
      orbitAngle: initialAngle,
      orbitSpeed: bridgeSpeed,
      baseX: saddleX,
      baseY: saddleY,
      parentSubgenre: meta.dominantSubgenre,
      tasteImportance: meta.tasteImportance,
      recencyFactor: meta.recencyFactor,
      isBridge: true,
      bridgeSaddle: {
        saddleX,
        saddleY,
        axisX,
        axisY,
        perpX,
        perpY,
        semiMajor,
        semiMinor,
        orbitSpeed: bridgeSpeed,
        initialAngle,
      },
    };

    universeArtists.push(artistObj);
    bridgeList.push({ artist: artistObj, genreA: meta.primaryGenre, genreB: meta.bridgeGenre! });

    const gSys = genreSystems.find((g) => g.name === meta.primaryGenre);
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
      const orbitSpeed = (0.0016 + (seed % 5) * 0.0004) * (i % 2 === 0 ? 1 : -1);

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

  // 7A. Real Listening Events / Currently Playing as Active Meteors
  if (playbackState?.isPlaying && playbackState.trackTitle && playbackState.artistName) {
    const pGenre = playbackState.genre || (records.find((r) => r.artist.toLowerCase() === playbackState.artistName?.toLowerCase())?.genre) || genreSystems[0]?.name || 'Unknown';
    const targetG = genreSystems.find((g) => g.name.toLowerCase() === pGenre.toLowerCase()) || genreSystems[0];
    if (targetG) {
      const col = getCelestialGenreColor(pGenre);
      const angle = 0.8;
      const startX = targetG.x + Math.cos(angle) * 480;
      const startY = targetG.y + Math.sin(angle) * 480;

      meteorsList.push({
        id: `meteor-currently-playing-${playbackState.trackTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        title: playbackState.trackTitle,
        artist: playbackState.artistName,
        genre: pGenre,
        subgenre: undefined,
        eventType: 'recently_played',
        reason: `Live playback: currently active in ${targetG.name}`,
        sourceGenre: 'Live Stream',
        targetGenre: targetG.name,
        startX,
        startY,
        targetX: targetG.x,
        targetY: targetG.y,
        currentX: startX,
        currentY: startY,
        speed: 0.0042,
        progress: 0.35,
        trailLength: 36,
        history: [],
        color: col.primary,
        celestialColor: col,
        createdAt: now,
      });
    }
  }

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
          speed: 0.0036 + eIdx * 0.0006,
          progress: (0.15 + eIdx * 0.25) % 1.0,
          trailLength: 32,
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
        speed: 0.0034,
        progress: 0.45,
        trailLength: 30,
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
      speed: 0.0032 + dIdx * 0.0006,
      progress: (0.15 + dIdx * 0.35) % 1.0,
      trailLength: 32,
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
        speed: 0.0036,
        progress: 0.65,
        trailLength: 30,
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
