import type { RawTrackRecord, Track, Artist, Genre, ListeningEvent } from '../types';

export interface NormalizedMusicDatabase {
  tracks: Map<string, Track>;
  artists: Map<string, Artist>;
  genres: Map<string, Genre>;
  listeningEvents: ListeningEvent[];
  rawRecords: RawTrackRecord[];
}

/**
 * Creates an empty normalized music database
 */
export function createEmptyDatabase(): NormalizedMusicDatabase {
  return {
    tracks: new Map(),
    artists: new Map(),
    genres: new Map(),
    listeningEvents: [],
    rawRecords: [],
  };
}

/**
 * Normalizes raw records (from CSV, JSON, presets, or Spotify) into
 * canonical entity structures.
 */
export function normalizeMusicRecords(
  records: RawTrackRecord[],
  source: Track['source'] = 'preset',
  existingDb?: NormalizedMusicDatabase
): NormalizedMusicDatabase {
  const db = existingDb ? { ...existingDb } : createEmptyDatabase();
  const rawList: RawTrackRecord[] = existingDb ? [...existingDb.rawRecords] : [];

  for (const rec of records) {
    const trackTitle = (rec.track || '').trim();
    const artistName = (rec.artist || 'Unknown Artist').trim();
    const genreName = (rec.genre || 'Electronic').trim();
    const subgenreName = rec.subgenre?.trim();

    if (!trackTitle) continue;

    // Stable track key
    const trackId = rec.id || `track-${normalizeId(artistName)}--${normalizeId(trackTitle)}`;
    const artistId = `artist-${normalizeId(artistName)}`;
    const genreId = `genre-${normalizeId(genreName)}`;

    // Upsert Track
    if (!db.tracks.has(trackId)) {
      db.tracks.set(trackId, {
        id: trackId,
        title: trackTitle,
        artistName,
        genre: genreName,
        subgenre: subgenreName,
        album: rec.album,
        year: rec.year,
        durationFormatted: rec.duration,
        bpm: rec.bpm ?? null,
        spotifyUrl: rec.spotifyUrl,
        source,
      });
      rawList.push(rec);
    }

    // Upsert Artist
    const existingArtist = db.artists.get(artistId);
    if (existingArtist) {
      if (!existingArtist.genres.includes(genreName)) {
        existingArtist.genres.push(genreName);
      }
      existingArtist.trackCount++;
    } else {
      db.artists.set(artistId, {
        id: artistId,
        name: artistName,
        primaryGenre: genreName,
        genres: [genreName],
        trackCount: 1,
      });
    }

    // Upsert Genre
    const existingGenre = db.genres.get(genreId);
    if (existingGenre) {
      existingGenre.trackCount++;
    } else {
      db.genres.set(genreId, {
        id: genreId,
        name: genreName,
        trackCount: 1,
        artistCount: 1,
        relatedGenreNames: [],
      });
    }
  }

  // Recalculate artist count for genres
  for (const genre of db.genres.values()) {
    let artistCount = 0;
    for (const artist of db.artists.values()) {
      if (artist.genres.includes(genre.name)) {
        artistCount++;
      }
    }
    genre.artistCount = artistCount;
  }

  db.rawRecords = rawList;
  return db;
}

/**
 * Deduplicates and ingests incoming listening events
 */
export function ingestListeningEvents(
  db: NormalizedMusicDatabase,
  newEvents: ListeningEvent[]
): { db: NormalizedMusicDatabase; addedCount: number; addedEvents: ListeningEvent[] } {
  const existingEventIds = new Set(db.listeningEvents.map((e) => e.id));
  const newlyAdded: ListeningEvent[] = [];

  for (const evt of newEvents) {
    if (!existingEventIds.has(evt.id)) {
      existingEventIds.add(evt.id);
      db.listeningEvents.unshift(evt); // newest first
      newlyAdded.push(evt);

      // Ensure canonical track & artist exist
      const trackId = evt.trackId;
      if (!db.tracks.has(trackId)) {
        db.tracks.set(trackId, {
          id: trackId,
          title: evt.trackTitle,
          artistName: evt.artistName,
          genre: evt.genre,
          subgenre: evt.subgenre,
          bpm: evt.bpm ?? null,
          durationMs: evt.durationMs,
          source: 'spotify',
        });

        db.rawRecords.unshift({
          id: trackId,
          track: evt.trackTitle,
          artist: evt.artistName,
          genre: evt.genre,
          subgenre: evt.subgenre,
          bpm: evt.bpm ?? null,
          playedAt: evt.playedAt,
        });
      }
    }
  }

  // Sort events newest first
  db.listeningEvents.sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());

  return { db, addedCount: newlyAdded.length, addedEvents: newlyAdded };
}

function normalizeId(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}
