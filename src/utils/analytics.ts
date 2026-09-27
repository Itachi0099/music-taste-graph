import type { RawTrackRecord, TasteSummary } from '../types';
import { extractTasteProfile } from './tasteProfile';

export const computeAnalytics = (records: RawTrackRecord[]): TasteSummary => {
  const tasteProfile = extractTasteProfile(records);
  const uniqueArtists = new Set<string>();
  const genreCounts: Record<string, number> = {};
  const moodCounts: Record<string, number> = {};
  let totalBpm = 0;
  let bpmCount = 0;

  const bpmDistribution = [
    { range: 'Chill (<100)', count: 0 },
    { range: 'Groove (100-125)', count: 0 },
    { range: 'Energy (125-140)', count: 0 },
    { range: 'Intense (>140)', count: 0 },
  ];

  records.forEach((record) => {
    uniqueArtists.add(record.artist);
    genreCounts[record.genre] = (genreCounts[record.genre] || 0) + 1;
    
    // Derive deterministic mood label based on genre and BPM if not provided
    const mood = record.mood || deriveMood(record.genre, record.bpm);
    moodCounts[mood] = (moodCounts[mood] || 0) + 1;

    if (record.bpm && record.bpm > 0) {
      totalBpm += record.bpm;
      bpmCount++;
      
      if (record.bpm < 100) bpmDistribution[0].count++;
      else if (record.bpm <= 125) bpmDistribution[1].count++;
      else if (record.bpm <= 140) bpmDistribution[2].count++;
      else bpmDistribution[3].count++;
    }
  });

  const sortedGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([genre, count]) => ({ 
      genre, 
      count, 
      percentage: records.length ? Math.round((count / records.length) * 100) : 0 
    }));

  const sortedMoods = Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([mood, count]) => ({
      mood,
      count,
      percentage: records.length ? Math.round((count / records.length) * 100) : 0,
      color: '#525252'
    }));

  const averageBpm = bpmCount > 0 ? Math.round(totalBpm / bpmCount) : (tasteProfile.bpmRange.preferred || 124);
  
  // Deterministic, explainable listener personas based on exploration score and tempo
  let tastePersona = 'Eclectic Explorer';
  if (tasteProfile.diversityScore > 0.8 && tasteProfile.explorationScore > 0.7) {
    tastePersona = 'Deep-Space Cosmic Nomad';
  } else if (tasteProfile.artistConcentration > 0.6) {
    const topArtist = Object.entries(tasteProfile.artistAffinity).sort((a, b) => b[1] - a[1])[0]?.[0];
    tastePersona = topArtist ? `${topArtist} Devotee` : 'Auteur Loyalist';
  } else if (sortedGenres.length > 0 && sortedGenres[0].percentage > 40) {
    tastePersona = `${sortedGenres[0].genre} Purist`;
  } else if (averageBpm > 135) {
    tastePersona = 'High-Velocity Sonic Architect';
  } else if (averageBpm >= 120 && averageBpm <= 135) {
    tastePersona = 'Club & Groove Aficionado';
  } else if (averageBpm > 0 && averageBpm < 105) {
    tastePersona = 'Ambient & Downtempo Voyager';
  }

  // Energy spectrum score derived deterministically from average BPM & energy profile
  const energyScore = Math.min(100, Math.max(10, Math.round((averageBpm / 150) * 100)));

  return {
    totalTracks: records.length,
    totalArtists: uniqueArtists.size,
    totalGenres: Object.keys(genreCounts).length,
    averageBpm,
    topGenres: sortedGenres.slice(0, 6),
    bpmDistribution,
    dominantMood: sortedMoods.length > 0 ? sortedMoods[0].mood : 'Harmonic',
    moodBreakdown: sortedMoods,
    energyScore: energyScore || 50,
    tastePersona,
    tasteProfile,
  };
};

function deriveMood(genre: string, bpm?: number | null): string {
  const g = genre.toLowerCase();
  if (g.includes('ambient') || (bpm && bpm < 95)) return 'Atmospheric';
  if (g.includes('techno') || (bpm && bpm > 132)) return 'Hypnotic & Driving';
  if (g.includes('house') || (bpm && bpm >= 120 && bpm <= 130)) return 'Rhythmic';
  if (g.includes('indie') || g.includes('rock')) return 'Textural';
  return 'Harmonic';
}
