import type { RawTrackRecord, RecommendationItem } from '../types';
import { getMoodForTrack } from './colors';

// Rich catalog of discovery items to power the recommendation engine
const DISCOVERY_CATALOG: Array<{
  track: string;
  artist: string;
  genre: string;
  bpm: number;
  mood: string;
  tags: string[];
}> = [
  // Electronic / Dance
  { track: "Strobe (Club Edit)", artist: "deadmau5", genre: "Progressive House", bpm: 128, mood: "Euphoric", tags: ["synth", "melodic", "club"] },
  { track: "Cola", artist: "CamelPhat & Elderbrook", genre: "House", bpm: 122, mood: "Groovy", tags: ["bassline", "vocal", "dark"] },
  { track: "Glue", artist: "Bicep", genre: "Breakbeat", bpm: 130, mood: "Hypnotic", tags: ["rave", "breaks", "nostalgia"] },
  { track: "Rhyme Dust", artist: "MK & Dom Dolla", genre: "House", bpm: 128, mood: "Energized", tags: ["festival", "tech house", "club"] },
  { track: "Silence (DJ Tiësto Remix)", artist: "Delerium", genre: "Trance", bpm: 138, mood: "Euphoric", tags: ["classic", "vocal trance", "anthem"] },
  { track: "Love Story (KREAM Remix)", artist: "KREAM", genre: "Progressive House", bpm: 126, mood: "Groovy", tags: ["remix", "deep", "energy"] },
  { track: "Escape", artist: "Kx5 (deadmau5 & Kaskade)", genre: "Progressive House", bpm: 126, mood: "Euphoric", tags: ["vocal", "anthem", "progressive"] },
  { track: "Breathe", artist: "CamelPhat & Cristoph", genre: "Progressive House", bpm: 125, mood: "Euphoric", tags: ["melodic", "dark", "club"] },
  { track: "Lovelee Dae", artist: "Amtrac", genre: "House", bpm: 124, mood: "Groovy", tags: ["soulful", "chill", "house"] },
  { track: "Pulsewidth", artist: "Aphex Twin", genre: "IDM", bpm: 125, mood: "Hypnotic", tags: ["acid", "idm", "ambient"] },
  { track: "Inspector Norse", artist: "Todd Terje", genre: "Nu Disco", bpm: 120, mood: "Groovy", tags: ["funky", "space", "dance"] },
  { track: "Weval", artist: "Half Age", genre: "Electronic", bpm: 110, mood: "Introspective", tags: ["electronic", "moody", "synths"] },

  // Indie / Alternative
  { track: "505", artist: "Arctic Monkeys", genre: "Indie Rock", bpm: 140, mood: "Melancholic", tags: ["anthem", "indie", "garage"] },
  { track: "The Adults Are Talking", artist: "The Strokes", genre: "Indie Rock", bpm: 165, mood: "Energized", tags: ["guitar", "post-punk", "new york"] },
  { track: "Electric Feel (Justice Remix)", artist: "MGMT", genre: "Alternative Dance", bpm: 128, mood: "Groovy", tags: ["french touch", "funk", "electro"] },
  { track: "Midnight City", artist: "M83", genre: "Synth-pop", bpm: 105, mood: "Euphoric", tags: ["dream pop", "saxophone", "80s"] },
  { track: "Obstacle 1", artist: "Interpol", genre: "Post-Punk Revival", bpm: 136, mood: "Dark / Intense", tags: ["post-punk", "bass", "moody"] },
  { track: "Little Dark Age", artist: "MGMT", genre: "Synth-pop", bpm: 98, mood: "Hypnotic", tags: ["goth", "synth", "viral"] },
  { track: "Mykonos", artist: "Fleet Foxes", genre: "Indie Folk", bpm: 115, mood: "Chill / Relaxed", tags: ["harmony", "acoustic", "lush"] },
  { track: "Seventeen", artist: "Sharon Van Etten", genre: "Indie Rock", bpm: 124, mood: "Energized", tags: ["heartland", "vocal", "drive"] },
  { track: "A-Punk", artist: "Vampire Weekend", genre: "Indie Rock", bpm: 175, mood: "Energized", tags: ["upbeat", "afro-pop", "indie"] },
  { track: "Redbone", artist: "Childish Gambino", genre: "R&B", bpm: 116, mood: "Groovy", tags: ["psychedelic", "funk", "soul"] },

  // Jazz / Chill / Eclectic
  { track: "Autumn Leaves", artist: "Chet Baker", genre: "Jazz", bpm: 95, mood: "Chill / Relaxed", tags: ["trumpet", "cool jazz", "nocturnal"] },
  { track: "Round Midnight", artist: "Thelonious Monk", genre: "Jazz", bpm: 62, mood: "Melancholic", tags: ["piano", "standard", "ballad"] },
  { track: "Unfinished Sympathy", artist: "Massive Attack", genre: "Trip Hop", bpm: 77, mood: "Introspective", tags: ["strings", "soul", "bristol"] },
  { track: "Sour Times", artist: "Portishead", genre: "Trip Hop", bpm: 68, mood: "Dark / Intense", tags: ["sample", "noir", "bristol"] },
  { track: "Nikes", artist: "Frank Ocean", genre: "R&B", bpm: 120, mood: "Introspective", tags: ["lo-fi", "contemporary", "lush"] },
  { track: "Shook Ones, Pt. II", artist: "Mobb Deep", genre: "Hip Hop", bpm: 94, mood: "Dark / Intense", tags: ["east coast", "90s", "grimy"] },
  { track: "Halcyon and On and On", artist: "Orbital", genre: "Trance", bpm: 127, mood: "Euphoric", tags: ["ambient", "breakbeat", "anthem"] },
  { track: "Music Sounds Better With You", artist: "Stardust", genre: "French House", bpm: 124, mood: "Groovy", tags: ["roule", "sample", "timeless"] }
];

export const generateRecommendations = (
  userRecords: RawTrackRecord[],
  filterMood?: string
): RecommendationItem[] => {
  if (!userRecords.length) return [];

  // 1. Extract user profile traits
  const existingTracks = new Set(userRecords.map(r => `${r.track.toLowerCase()}-${r.artist.toLowerCase()}`));
  const existingArtists = new Set(userRecords.map(r => r.artist.toLowerCase()));
  
  const genreFrequency: Record<string, number> = {};
  let totalBpm = 0;
  let bpmCount = 0;

  userRecords.forEach(r => {
    genreFrequency[r.genre] = (genreFrequency[r.genre] || 0) + 1;
    if (r.bpm) {
      totalBpm += r.bpm;
      bpmCount++;
    }
  });

  const avgUserBpm = bpmCount > 0 ? totalBpm / bpmCount : 120;
  const topGenres = Object.entries(genreFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);

  // 2. Score items from the discovery catalog
  const scoredItems: Array<RecommendationItem & { rawScore: number }> = [];

  DISCOVERY_CATALOG.forEach((item, index) => {
    // Skip if already in user's library
    const trackKey = `${item.track.toLowerCase()}-${item.artist.toLowerCase()}`;
    if (existingTracks.has(trackKey)) return;

    let score = 50; // base score
    let reasons: string[] = [];

    // Genre Affinity
    if (topGenres.includes(item.genre)) {
      const rank = topGenres.indexOf(item.genre);
      const boost = Math.max(10, 30 - rank * 6);
      score += boost;
      reasons.push(`matches your top genre "${item.genre}"`);
    } else {
      // Related genre check (e.g. house vs progressive house)
      const matchesSubgenre = topGenres.some(tg => 
        tg.toLowerCase().includes(item.genre.toLowerCase()) || 
        item.genre.toLowerCase().includes(tg.toLowerCase())
      );
      if (matchesSubgenre) {
        score += 15;
        reasons.push(`expands on your taste in related styles`);
      }
    }

    // Artist affinity
    if (existingArtists.has(item.artist.toLowerCase())) {
      score += 25;
      reasons.push(`by ${item.artist} whom you already listen to`);
    }

    // BPM Tempo proximity
    const bpmDiff = Math.abs(item.bpm - avgUserBpm);
    if (bpmDiff < 10) {
      score += 15;
      reasons.push(`perfect BPM sync (${item.bpm} BPM ~ your avg ${Math.round(avgUserBpm)})`);
    } else if (bpmDiff < 20) {
      score += 8;
    }

    // Mood match
    const derivedMood = item.mood || getMoodForTrack(item.genre, item.bpm);
    if (filterMood && filterMood !== 'all') {
      if (derivedMood.toLowerCase() === filterMood.toLowerCase()) {
        score += 20;
        reasons.push(`aligns with your active ${derivedMood} mood filter`);
      } else {
        score -= 30; // penalize if filtering for a specific mood
      }
    }

    // Add unique recommendation entry
    const finalScore = Math.min(99, Math.max(65, Math.round(score)));
    const reasonText = reasons.length > 0 
      ? reasons.slice(0, 2).join(' and ') 
      : `High sonic affinity with your audio fingerprint`;

    scoredItems.push({
      id: `rec-${index}-${item.artist.toLowerCase().replace(/\s+/g, '-')}`,
      type: existingArtists.has(item.artist.toLowerCase()) ? 'track' : 'artist',
      title: item.track,
      subtitle: item.artist,
      genre: item.genre,
      bpm: item.bpm,
      mood: derivedMood,
      matchScore: finalScore,
      reason: reasonText.charAt(0).toUpperCase() + reasonText.slice(1),
      energy: Math.min(1, Math.max(0.2, item.bpm / 160)),
      rawScore: score,
    });
  });

  // Sort by score descending and return top matches
  return scoredItems
    .sort((a, b) => b.rawScore - a.rawScore)
    .slice(0, 10)
    .map(({ rawScore: _rawScore, ...item }) => item);
};
