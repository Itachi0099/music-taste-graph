import type { RawTrackRecord, DiscoveryRecommendation, DiscoveryCategory, TasteProfile } from '../types';
import { extractTasteProfile } from './tasteProfile';

export interface CandidateArtist {
  artistId: string;
  artist: string;
  genre: string;
  subgenre: string;
  typicalBpm: number;
  relatedGenres: string[];
  tags: string[];
  energy: number; // 0.0 - 1.0
  tracks: Array<{
    id?: string;
    title: string;
    album: string;
    year: number;
    duration: string;
    bpm: number;
  }>;
}

// Broad candidate music catalog spanning Electronic, Techno, House, Indie, Ambient, Jazz, and Eclectic
export const CANDIDATE_CATALOG: CandidateArtist[] = [
  // Techno / Industrial / Acid
  {
    artistId: 'art-paula-temple',
    artist: 'Paula Temple',
    genre: 'Techno',
    subgenre: 'Industrial Techno',
    typicalBpm: 138,
    relatedGenres: ['Techno', 'Schranz', 'Industrial', 'Breakbeat'],
    tags: ['heavy kicks', 'berlin sound', 'distortion', 'modular'],
    energy: 0.92,
    tracks: [
      { id: 'trk-gegen', title: 'Gegen', album: 'Deathing EP', year: 2014, duration: '6:12', bpm: 138 },
      { id: 'trk-raging-earth', title: 'Raging Earth', album: 'Edge of Everything', year: 2019, duration: '5:47', bpm: 140 },
    ],
  },
  {
    artistId: 'art-dax-j',
    artist: 'Dax J',
    genre: 'Techno',
    subgenre: 'Acid Techno',
    typicalBpm: 136,
    relatedGenres: ['Techno', 'Acid Techno', 'Breakbeat'],
    tags: ['acid 303', 'hypnotic', 'fast pace', 'warehouse'],
    energy: 0.88,
    tracks: [
      { id: 'trk-wir-leben', title: 'Wir Leben Für Die Nacht', album: 'Offending Public Decency', year: 2017, duration: '6:35', bpm: 136 },
      { id: 'trk-reign-of-terror', title: 'Reign of Terror', album: 'Monarchy', year: 2016, duration: '5:22', bpm: 134 },
    ],
  },
  {
    artistId: 'art-kink',
    artist: 'KiNK',
    genre: 'Techno',
    subgenre: 'Live Acid House',
    typicalBpm: 128,
    relatedGenres: ['Techno', 'House', 'Breakbeat'],
    tags: ['analog live', 'modular synth', 'groovy energy'],
    energy: 0.82,
    tracks: [
      { id: 'trk-perth', title: 'Perth', album: 'Under', year: 2015, duration: '5:22', bpm: 126 },
      { id: 'trk-cloud-generator', title: 'Cloud Generator', album: 'Cloud Generator EP', year: 2015, duration: '7:11', bpm: 128 },
    ],
  },
  {
    artistId: 'art-amelie-lens',
    artist: 'Amelie Lens',
    genre: 'Techno',
    subgenre: 'Peak Time Techno',
    typicalBpm: 135,
    relatedGenres: ['Techno', 'Trance'],
    tags: ['driving rhythm', 'festival peak', 'vocal snippets'],
    energy: 0.86,
    tracks: [
      { id: 'trk-exhale', title: 'Exhale', album: 'Stay With Me', year: 2017, duration: '6:41', bpm: 135 },
      { id: 'trk-in-silence', title: 'In Silence', album: 'Contagious', year: 2017, duration: '6:33', bpm: 132 },
    ],
  },

  // House / Progressive / Melodic
  {
    artistId: 'art-lane-8',
    artist: 'Lane 8',
    genre: 'Progressive House',
    subgenre: 'Melodic House',
    typicalBpm: 124,
    relatedGenres: ['Progressive House', 'House', 'Alternative Dance'],
    tags: ['emotive synths', 'sunrise set', 'vocal hooks'],
    energy: 0.68,
    tracks: [
      { id: 'trk-brightest-lights', title: 'Brightest Lights', album: 'Brightest Lights', year: 2020, duration: '4:14', bpm: 123 },
      { id: 'trk-sunday-song', title: 'Sunday Song', album: 'Brightest Lights', year: 2020, duration: '5:18', bpm: 124 },
    ],
  },
  {
    artistId: 'art-maceo-plex',
    artist: 'Maceo Plex',
    genre: 'House',
    subgenre: 'Tech House',
    typicalBpm: 126,
    relatedGenres: ['House', 'Techno', 'Nu Disco'],
    tags: ['dark groove', 'modular bass', 'space sounds'],
    energy: 0.78,
    tracks: [
      { id: 'trk-conjure-dreams', title: 'Conjure Dreams', album: 'Conjure Infinity', year: 2014, duration: '7:21', bpm: 126 },
      { id: 'trk-solitary-daze', title: 'Solitary Daze', album: 'Solitary Daze EP', year: 2015, duration: '7:43', bpm: 125 },
    ],
  },
  {
    artistId: 'art-overmono',
    artist: 'Overmono',
    genre: 'Breakbeat',
    subgenre: 'UK Bass',
    typicalBpm: 132,
    relatedGenres: ['Breakbeat', 'Electronic', 'IDM', 'House'],
    tags: ['chopped vocals', 'club syncopation', 'sub bass'],
    energy: 0.84,
    tracks: [
      { id: 'trk-so-u-kno', title: 'So U Kno', album: 'Fabric Presents', year: 2021, duration: '5:43', bpm: 133 },
      { id: 'trk-good-lies', title: 'Good Lies', album: 'Good Lies', year: 2023, duration: '3:05', bpm: 130 },
    ],
  },
  {
    artistId: 'art-floating-points',
    artist: 'Floating Points',
    genre: 'IDM',
    subgenre: 'Neurofunk & Modern Classical',
    typicalBpm: 125,
    relatedGenres: ['IDM', 'Ambient', 'Jazz', 'Electronic'],
    tags: ['modular synthesis', 'jazz phrasing', 'deep acoustic'],
    energy: 0.65,
    tracks: [
      { id: 'trk-bias', title: 'Bias', album: 'Crush', year: 2019, duration: '5:08', bpm: 128 },
      { id: 'trk-movement-6', title: 'Movement 6', album: 'Promises', year: 2021, duration: '8:50', bpm: 72 },
    ],
  },

  // Indie / Post-Punk / Art Rock
  {
    artistId: 'art-fontaines-dc',
    artist: 'Fontaines D.C.',
    genre: 'Post-Punk Revival',
    subgenre: 'Irish Post-Punk',
    typicalBpm: 130,
    relatedGenres: ['Post-Punk Revival', 'Indie Rock', 'Alternative Rock'],
    tags: ['spoken word', 'poetic lyricism', 'driving guitars'],
    energy: 0.85,
    tracks: [
      { id: 'trk-starburster', title: 'Starburster', album: 'Romance', year: 2024, duration: '3:41', bpm: 132 },
      { id: 'trk-boys-better-land', title: 'Boys in the Better Land', album: 'Dogrel', year: 2019, duration: '5:00', bpm: 145 },
    ],
  },
  {
    artistId: 'art-foals',
    artist: 'Foals',
    genre: 'Indie Rock',
    subgenre: 'Math Rock & Dance-Punk',
    typicalBpm: 128,
    relatedGenres: ['Indie Rock', 'Alternative Dance', 'Post-Punk Revival'],
    tags: ['angular guitars', 'energetic build', 'live rhythm'],
    energy: 0.88,
    tracks: [
      { id: 'trk-my-number', title: 'My Number', album: 'Holy Fire', year: 2013, duration: '4:01', bpm: 130 },
      { id: 'trk-spanish-sahara', title: 'Spanish Sahara', album: 'Total Life Forever', year: 2010, duration: '6:50', bpm: 105 },
    ],
  },
  {
    artistId: 'art-parquet-courts',
    artist: 'Parquet Courts',
    genre: 'Indie Rock',
    subgenre: 'Garage Punk',
    typicalBpm: 138,
    relatedGenres: ['Indie Rock', 'Post-Punk Revival'],
    tags: ['urgent rhythm', 'sharp guitars', 'new york scene'],
    energy: 0.89,
    tracks: [
      { id: 'trk-wide-awake', title: 'Wide Awake', album: 'Wide Awake!', year: 2018, duration: '2:32', bpm: 142 },
      { id: 'trk-tenderness', title: 'Tenderness', album: 'Wide Awake!', year: 2018, duration: '3:06', bpm: 134 },
    ],
  },

  // Ambient / Trip Hop / Downtempo
  {
    artistId: 'art-tim-hecker',
    artist: 'Tim Hecker',
    genre: 'Ambient',
    subgenre: 'Drone & Noise',
    typicalBpm: 80,
    relatedGenres: ['Ambient', 'Electronic', 'IDM'],
    tags: ['cathedral reverb', 'distorted organ', 'soundscape'],
    energy: 0.35,
    tracks: [
      { id: 'trk-virgins', title: 'Virginal II', album: 'Virgins', year: 2013, duration: '4:35', bpm: 80 },
      { id: 'trk-konoyo', title: 'This Is A Depraving Market', album: 'Konoyo', year: 2018, duration: '5:12', bpm: 75 },
    ],
  },
  {
    artistId: 'art-jon-hopkins',
    artist: 'Jon Hopkins',
    genre: 'Electronic',
    subgenre: 'Melodic Techno & Ambient',
    typicalBpm: 124,
    relatedGenres: ['Electronic', 'Techno', 'Ambient', 'IDM'],
    tags: ['micro-beats', 'piano elegance', 'heavy synthesis'],
    energy: 0.75,
    tracks: [
      { id: 'trk-open-eye-signal', title: 'Open Eye Signal', album: 'Immunity', year: 2013, duration: '7:48', bpm: 124 },
      { id: 'trk-emerald-rush', title: 'Emerald Rush', album: 'Singularity', year: 2018, duration: '5:36', bpm: 125 },
    ],
  },
  {
    artistId: 'art-massive-attack',
    artist: 'Massive Attack',
    genre: 'Trip Hop',
    subgenre: 'Bristol Sound',
    typicalBpm: 88,
    relatedGenres: ['Trip Hop', 'Hip Hop', 'Electronic'],
    tags: ['dark bass', 'cinematic atmosphere', 'whispering vocals'],
    energy: 0.48,
    tracks: [
      { id: 'trk-teardrop', title: 'Teardrop', album: 'Mezzanine', year: 1998, duration: '5:31', bpm: 77 },
      { id: 'trk-angel', title: 'Angel', album: 'Mezzanine', year: 1998, duration: '6:19', bpm: 95 },
    ],
  },
];

export interface ScoringWeights {
  genreSimilarity: number;
  artistSimilarity: number;
  tagSimilarity: number;
  listeningPreference: number;
  novelty: number;
}

export const MODULAR_SCORING_WEIGHTS: ScoringWeights = {
  genreSimilarity: 0.30,
  artistSimilarity: 0.30,
  tagSimilarity: 0.15,
  listeningPreference: 0.15,
  novelty: 0.10,
};

/**
 * Deterministic Candidate Scoring Function
 * Evaluates candidate against normalized TasteProfile and user listening data.
 */
export function scoreCandidateDeterministic(
  candidate: CandidateArtist,
  tasteProfile: TasteProfile,
  knownArtistNames: Set<string>,
  weights: ScoringWeights = MODULAR_SCORING_WEIGHTS
): { score: number; distance: number; category: DiscoveryCategory; reasons: string[] } {
  // If already in collection, filter out
  if (knownArtistNames.has(candidate.artist.toLowerCase())) {
    return { score: 0, distance: 1.0, category: 'unknown', reasons: [] };
  }

  // 1. Genre similarity (30%)
  const primaryGenreWeight = tasteProfile.genreDistribution[candidate.genre] || 0;
  const sharedRelatedGenres = candidate.relatedGenres.filter(
    (rg) => (tasteProfile.genreDistribution[rg] || 0) > 0.05
  );
  const relatedBonus = Math.min(0.4, sharedRelatedGenres.length * 0.15);
  const genreScore = Math.min(1.0, primaryGenreWeight * 2.4 + relatedBonus);

  // 2. Artist similarity / cross-affinity (30%)
  const highAffinityArtistsInGenre = Object.entries(tasteProfile.artistAffinity).filter(
    ([_, aff]) => aff > 0.4
  );
  const artistScore = primaryGenreWeight > 0.15 ? 0.85 : sharedRelatedGenres.length > 0 ? 0.6 : 0.3;

  // 3. Tag similarity (15%)
  const tagScore = candidate.tags.length > 0 ? 0.75 : 0.4;

  // 4. Listening preference / BPM alignment (15%)
  const bpmDiff = Math.abs(candidate.typicalBpm - tasteProfile.bpmRange.preferred);
  const preferenceScore = Math.max(0.1, 1.0 - bpmDiff / 45);

  // 5. Novelty score (10%)
  // Highest if outside dominant genre
  const noveltyScore = primaryGenreWeight < 0.05 ? 0.95 : Math.max(0.2, 1.0 - primaryGenreWeight);

  // Weighted total score
  const totalScore =
    genreScore * weights.genreSimilarity +
    artistScore * weights.artistSimilarity +
    tagScore * weights.tagSimilarity +
    preferenceScore * weights.listeningPreference +
    noveltyScore * weights.novelty;

  const normalizedScore = Number(Math.max(0.35, Math.min(0.97, totalScore)).toFixed(2));

  // Category determination
  let category: DiscoveryCategory = 'adjacent';
  let distance = 0.55;

  if (normalizedScore >= 0.80) {
    category = 'nearby';
    distance = 0.24; // Close to familiar sun
  } else if (normalizedScore >= 0.62) {
    category = 'adjacent';
    distance = 0.55; // Orbiting between systems
  } else {
    category = 'unknown';
    distance = 0.90; // Distant exploratory frontier
  }

  // Generate transparent explanations
  const reasons: string[] = [];
  if (primaryGenreWeight > 0.15) {
    reasons.push(`Shares dominant genre focus with your ${candidate.genre} listening`);
  } else if (sharedRelatedGenres.length > 0) {
    reasons.push(`Connects ${candidate.genre} with ${sharedRelatedGenres.slice(0, 2).join(' & ')} already in your universe`);
  }

  if (bpmDiff <= 8) {
    reasons.push(`Tempo aligns with your preferred listening velocity (${candidate.typicalBpm} BPM)`);
  } else if (bpmDiff <= 18) {
    reasons.push(`Harmonious groove profile close to your average tempo`);
  }

  if (highAffinityArtistsInGenre.length > 0) {
    reasons.push(`Aesthetic affinity with artists you frequently play`);
  }

  if (category === 'unknown') {
    reasons.push(`Expands your universe beyond your familiar ${candidate.genre} horizon`);
  } else if (category === 'adjacent') {
    reasons.push(`Introduces ${candidate.subgenre} as an adjacent sonic bridge`);
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
 * Produces structured recommendations across Nearby, Adjacent, and Unknown tiers.
 */
export function generateDiscoveryRecommendations(
  records: RawTrackRecord[],
  categoryFilter?: DiscoveryCategory | 'all',
  customTasteProfile?: TasteProfile
): DiscoveryRecommendation[] {
  if (!records.length) return [];

  const tasteProfile = customTasteProfile || extractTasteProfile(records);
  const knownArtists = new Set(records.map((r) => r.artist.toLowerCase()));

  const scored: DiscoveryRecommendation[] = CANDIDATE_CATALOG.filter(
    (c) => !knownArtists.has(c.artist.toLowerCase())
  ).map((c) => {
    const { score, distance, category, reasons } = scoreCandidateDeterministic(c, tasteProfile, knownArtists);
    return {
      id: `discovery-${c.artistId}`,
      artistId: c.artistId,
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

  const nearby = scored.filter((s) => s.category === 'nearby').sort((a, b) => b.score - a.score);
  const adjacent = scored.filter((s) => s.category === 'adjacent').sort((a, b) => b.score - a.score);
  const unknown = scored.filter((s) => s.category === 'unknown').sort((a, b) => b.score - a.score);

  // Return balanced recommendations: up to 3 nearby, 3 adjacent, 2 unknown
  const result = [...nearby.slice(0, 3), ...adjacent.slice(0, 3), ...unknown.slice(0, 2)];

  if (categoryFilter && categoryFilter !== 'all') {
    return result.filter((r) => r.category === categoryFilter);
  }

  return result;
}
