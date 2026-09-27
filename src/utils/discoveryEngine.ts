import type { RawTrackRecord, DiscoveryRecommendation, DiscoveryCategory } from '../types';
import { extractTasteProfile } from './tasteProfile';

interface CandidateArtist {
  artist: string;
  genre: string;
  subgenre: string;
  typicalBpm: number;
  relatedGenres: string[];
  tags: string[];
  tracks: Array<{
    title: string;
    album: string;
    year: number;
    duration: string;
    bpm: number;
  }>;
}

// Broad candidate music catalog spanning Electronic, Indie, Eclectic, Ambient, and Techno
const CANDIDATE_CATALOG: CandidateArtist[] = [
  // Techno / Industrial / Acid
  {
    artist: 'Paula Temple',
    genre: 'Techno',
    subgenre: 'Industrial Techno',
    typicalBpm: 138,
    relatedGenres: ['Techno', 'Schranz', 'Industrial'],
    tags: ['heavy kicks', 'berlin sound', 'distortion'],
    tracks: [
      { title: 'Gegen', album: 'Deathing EP', year: 2014, duration: '6:12', bpm: 138 },
      { title: 'Raging Earth', album: 'Edge of Everything', year: 2019, duration: '5:47', bpm: 140 },
    ],
  },
  {
    artist: 'Dax J',
    genre: 'Techno',
    subgenre: 'Acid Techno',
    typicalBpm: 136,
    relatedGenres: ['Techno', 'Acid Techno', 'Breakbeat'],
    tags: ['acid 303', 'hypnotic', 'fast pace'],
    tracks: [
      { title: 'Wir Leben Für Die Nacht', album: 'Offending Public Decency', year: 2017, duration: '6:35', bpm: 136 },
      { title: 'Reign of Terror', album: 'Monarchy', year: 2016, duration: '5:22', bpm: 134 },
    ],
  },
  {
    artist: 'KiNK',
    genre: 'Techno',
    subgenre: 'Live Acid House',
    typicalBpm: 128,
    relatedGenres: ['Techno', 'House', 'Breakbeat'],
    tags: ['analog live', 'modular synth', 'groovy energy'],
    tracks: [
      { title: 'Perth', album: 'Under', year: 2015, duration: '5:22', bpm: 126 },
      { title: 'Cloud Generator', album: 'Cloud Generator EP', year: 2015, duration: '7:11', bpm: 128 },
    ],
  },
  {
    artist: 'Amelie Lens',
    genre: 'Techno',
    subgenre: 'Peak Time Techno',
    typicalBpm: 135,
    relatedGenres: ['Techno', 'Trance'],
    tags: ['driving rhythm', 'festival peak', 'vocal snippets'],
    tracks: [
      { title: 'Exhale', album: 'Stay With Me', year: 2017, duration: '6:41', bpm: 135 },
      { title: 'In Silence', album: 'Contagious', year: 2017, duration: '6:33', bpm: 132 },
    ],
  },

  // House / Progressive / Melodic
  {
    artist: 'Lane 8',
    genre: 'Progressive House',
    subgenre: 'Melodic House',
    typicalBpm: 124,
    relatedGenres: ['Progressive House', 'House', 'Alternative Dance'],
    tags: ['emotive synths', 'sunrise set', 'vocal hooks'],
    tracks: [
      { title: 'Brightest Lights', album: 'Brightest Lights', year: 2020, duration: '4:14', bpm: 123 },
      { title: 'Sunday Song', album: 'Brightest Lights', year: 2020, duration: '5:18', bpm: 124 },
    ],
  },
  {
    artist: 'Maceo Plex',
    genre: 'House',
    subgenre: 'Tech House',
    typicalBpm: 126,
    relatedGenres: ['House', 'Techno', 'Nu Disco'],
    tags: ['dark groove', 'modular bass', 'space sounds'],
    tracks: [
      { title: 'Conjure Dreams', album: 'Conjure Infinity', year: 2014, duration: '7:21', bpm: 126 },
      { title: 'Solitary Daze', album: 'Solitary Daze EP', year: 2015, duration: '7:43', bpm: 125 },
    ],
  },
  {
    artist: 'Overmono',
    genre: 'Breakbeat',
    subgenre: 'UK Bass',
    typicalBpm: 132,
    relatedGenres: ['Breakbeat', 'Electronic', 'IDM', 'House'],
    tags: ['chopped vocals', 'club syncopation', 'sub bass'],
    tracks: [
      { title: 'So U Kno', album: 'Fabric Presents', year: 2021, duration: '5:43', bpm: 133 },
      { title: 'Good Lies', album: 'Good Lies', year: 2023, duration: '3:05', bpm: 130 },
    ],
  },
  {
    artist: 'Floating Points',
    genre: 'IDM',
    subgenre: 'Neurofunk & Modern Classical',
    typicalBpm: 125,
    relatedGenres: ['IDM', 'Ambient', 'Jazz', 'Electronic'],
    tags: ['modular synthesis', 'jazz phrasing', 'deep acoustic'],
    tracks: [
      { title: 'Bias', album: 'Crush', year: 2019, duration: '5:08', bpm: 128 },
      { title: 'Movement 6', album: 'Promises', year: 2021, duration: '8:50', bpm: 72 },
    ],
  },

  // Indie / Post-Punk / Art Rock
  {
    artist: 'Fontaines D.C.',
    genre: 'Post-Punk Revival',
    subgenre: 'Irish Post-Punk',
    typicalBpm: 130,
    relatedGenres: ['Post-Punk Revival', 'Indie Rock', 'Alternative Rock'],
    tags: ['spoken word', 'poetic lyricism', 'driving guitars'],
    tracks: [
      { title: 'Starburster', album: 'Romance', year: 2024, duration: '3:41', bpm: 132 },
      { title: 'Boys in the Better Land', album: 'Dogrel', year: 2019, duration: '5:00', bpm: 145 },
    ],
  },
  {
    artist: 'Foals',
    genre: 'Indie Rock',
    subgenre: 'Math Rock & Dance-Punk',
    typicalBpm: 128,
    relatedGenres: ['Indie Rock', 'Alternative Dance', 'Post-Punk Revival'],
    tags: ['angular guitars', 'energetic build', 'live rhythm'],
    tracks: [
      { title: 'My Number', album: 'Holy Fire', year: 2013, duration: '4:01', bpm: 130 },
      { title: 'Spanish Sahara', album: 'Total Life Forever', year: 2010, duration: '6:50', bpm: 105 },
    ],
  },
  {
    artist: 'Parquet Courts',
    genre: 'Indie Rock',
    subgenre: 'Garage Punk',
    typicalBpm: 138,
    relatedGenres: ['Indie Rock', 'Post-Punk Revival'],
    tags: ['urgent rhythm', 'sharp guitars', 'new york scene'],
    tracks: [
      { title: 'Wide Awake', album: 'Wide Awake!', year: 2018, duration: '2:32', bpm: 142 },
      { title: 'Tenderness', album: 'Wide Awake!', year: 2018, duration: '3:06', bpm: 134 },
    ],
  },

  // Ambient / Trip Hop / Downtempo
  {
    artist: 'Jon Hopkins',
    genre: 'Ambient',
    subgenre: 'Cosmic Ambient',
    typicalBpm: 118,
    relatedGenres: ['Ambient', 'IDM', 'Electronic', 'Techno'],
    tags: ['hypnotic modular', 'piano texture', 'spatial soundscape'],
    tracks: [
      { title: 'Emerald Rush', album: 'Singularity', year: 2018, duration: '5:36', bpm: 125 },
      { title: 'Immunity', album: 'Immunity', year: 2013, duration: '9:56', bpm: 110 },
    ],
  },
  {
    artist: 'Bonobo',
    genre: 'Trip Hop',
    subgenre: 'Downtempo Electronica',
    typicalBpm: 116,
    relatedGenres: ['Trip Hop', 'Electronic', 'Jazz'],
    tags: ['organic percussion', 'brass textures', 'warm chords'],
    tracks: [
      { title: 'Cirrus', album: 'The North Borders', year: 2013, duration: '5:52', bpm: 118 },
      { title: 'Kerala', album: 'Migration', year: 2017, duration: '3:57', bpm: 122 },
    ],
  },
  {
    artist: 'Nils Frahm',
    genre: 'Ambient',
    subgenre: 'Neo-Classical',
    typicalBpm: 95,
    relatedGenres: ['Ambient', 'Electronic', 'Jazz'],
    tags: ['felt piano', 'analog synths', 'spacious resonance'],
    tracks: [
      { title: 'Says', album: 'Spaces', year: 2013, duration: '8:18', bpm: 104 },
      { title: 'All Melody', album: 'All Melody', year: 2018, duration: '9:30', bpm: 120 },
    ],
  },
];

export interface ScoringWeights {
  genre: number;
  subgenre: number;
  artistRelatedness: number;
  bpm: number;
  novelty: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  genre: 0.30,
  subgenre: 0.20,
  artistRelatedness: 0.20,
  bpm: 0.15,
  novelty: 0.15,
};

/**
 * Computes recommendation score, category, spatial distance, and explanation reasons.
 */
export function scoreCandidate(
  candidate: CandidateArtist,
  records: RawTrackRecord[],
  weights: ScoringWeights = DEFAULT_WEIGHTS
): { score: number; distance: number; category: DiscoveryCategory; reasons: string[] } {
  const profile = extractTasteProfile(records);

  // 1. Genre similarity (0 - 1)
  const genreWeight = profile.genres[candidate.genre] || 0;
  const relatedGenreBonus = candidate.relatedGenres.some((rg) => (profile.genres[rg] || 0) > 0.08) ? 0.35 : 0;
  const genreScore = Math.min(1.0, genreWeight * 2.2 + relatedGenreBonus);

  // 2. Subgenre similarity
  const subgenreScore = profile.subgenres[candidate.subgenre] ? 0.9 : (candidate.relatedGenres.length > 1 ? 0.5 : 0.2);

  // 3. Artist familiarity / relatedness
  const knownArtists = new Set(records.map((r) => r.artist.toLowerCase()));
  const isDirectlyKnown = knownArtists.has(candidate.artist.toLowerCase());
  if (isDirectlyKnown) {
    return { score: 0, distance: 1.0, category: 'unknown', reasons: [] }; // filter out known
  }
  const artistRelatednessScore = genreWeight > 0.15 ? 0.85 : 0.45;

  // 4. BPM similarity
  const bpmDiff = Math.abs(candidate.typicalBpm - profile.bpmRange.preferred);
  const bpmScore = Math.max(0, 1.0 - bpmDiff / 45);

  // 5. Novelty (higher if outside primary genre)
  const noveltyScore = genreWeight === 0 ? 0.95 : Math.max(0.1, 1.0 - genreWeight);

  // Weighted total match score
  const totalScore = (
    genreScore * weights.genre +
    subgenreScore * weights.subgenre +
    artistRelatednessScore * weights.artistRelatedness +
    bpmScore * weights.bpm +
    noveltyScore * weights.novelty
  );

  const normalizedScore = Number(Math.max(0.35, Math.min(0.96, totalScore)).toFixed(2));

  // Determine Discovery Category
  let category: DiscoveryCategory = 'adjacent';
  let distance = 0.5;

  if (normalizedScore >= 0.82) {
    category = 'nearby';
    distance = 0.22; // Closer to familiar sun
  } else if (normalizedScore >= 0.65) {
    category = 'adjacent';
    distance = 0.55; // Orbiting between systems
  } else {
    category = 'unknown';
    distance = 0.92; // Distant frontier system
  }

  // Generate transparent reasons
  const reasons: string[] = [];
  if (genreWeight > 0.1) {
    reasons.push(`Strong overlap with your listening in ${candidate.genre}`);
  } else if (relatedGenreBonus > 0) {
    reasons.push(`Gravitationally bridges ${candidate.genre} with your favorite genres`);
  }
  if (bpmDiff <= 8) {
    reasons.push(`Tempo matches your preferred tempo (${candidate.typicalBpm} BPM)`);
  } else if (bpmDiff <= 18) {
    reasons.push(`Harmonious groove profile close to your average BPM`);
  }
  if (subgenreScore > 0.7) {
    reasons.push(`Direct alignment with your favorite subgenre (${candidate.subgenre})`);
  } else {
    reasons.push(`Introduces a new dimension: ${candidate.subgenre}`);
  }
  if (category === 'unknown') {
    reasons.push(`Outside your primary orbit — expands your musical horizon`);
  }

  return {
    score: normalizedScore,
    distance,
    category,
    reasons,
  };
}

/**
 * Main Personal Music Discovery Engine
 * Returns balanced recommendations: 3 Nearby, 3 Adjacent, 2 Unknown.
 */
export function generateDiscoveryRecommendations(
  records: RawTrackRecord[],
  categoryFilter?: DiscoveryCategory | 'all'
): DiscoveryRecommendation[] {
  if (!records.length) return [];

  const knownArtists = new Set(records.map((r) => r.artist.toLowerCase()));

  // Filter out already collected artists
  const eligible = CANDIDATE_CATALOG.filter((c) => !knownArtists.has(c.artist.toLowerCase()));

  const scored: DiscoveryRecommendation[] = eligible.map((c) => {
    const { score, distance, category, reasons } = scoreCandidate(c, records);
    return {
      id: `discovery-${c.artist.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      artist: c.artist,
      genre: c.genre,
      subgenre: c.subgenre,
      bpm: c.typicalBpm,
      category,
      score,
      distance,
      reasons,
      sampleTracks: c.tracks.map((t) => ({
        ...t,
        spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(`${c.artist} ${t.title}`)}`,
      })),
      spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(c.artist)}`,
    };
  });

  // Group by category to fulfill requirement: 3 Nearby, 3 Adjacent, 2 Unknown
  const nearby = scored.filter((s) => s.category === 'nearby').sort((a, b) => b.score - a.score);
  const adjacent = scored.filter((s) => s.category === 'adjacent').sort((a, b) => b.score - a.score);
  const unknown = scored.filter((s) => s.category === 'unknown').sort((a, b) => b.score - a.score);

  const selectedNearby = nearby.slice(0, 3);
  const selectedAdjacent = adjacent.slice(0, 3);
  const selectedUnknown = unknown.slice(0, 2);

  const result = [...selectedNearby, ...selectedAdjacent, ...selectedUnknown];

  if (categoryFilter && categoryFilter !== 'all') {
    return result.filter((r) => r.category === categoryFilter);
  }

  return result;
}
