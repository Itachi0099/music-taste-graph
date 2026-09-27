import type { RawTrackRecord, TasteSummary } from '../types';

export const computeAnalytics = (records: RawTrackRecord[]): TasteSummary => {
  const uniqueArtists = new Set<string>();
  const genreCounts: Record<string, number> = {};
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
    
    if (record.bpm) {
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
    .map(([genre, count]) => ({ genre, count, percentage: Math.round((count / records.length) * 100) }));

  const averageBpm = bpmCount > 0 ? Math.round(totalBpm / bpmCount) : 0;
  
  let tastePersona = 'Eclectic Explorer';
  if (averageBpm > 130) tastePersona = 'High-Energy Raver';
  else if (averageBpm > 0 && averageBpm < 100) tastePersona = 'Chill Lounge Head';
  else if (sortedGenres.length > 0 && sortedGenres[0].percentage > 40) tastePersona = `${sortedGenres[0].genre} Purist`;

  return {
    totalTracks: records.length,
    totalArtists: uniqueArtists.size,
    totalGenres: Object.keys(genreCounts).length,
    averageBpm,
    topGenres: sortedGenres.slice(0, 5),
    bpmDistribution,
    tastePersona
  };
};
