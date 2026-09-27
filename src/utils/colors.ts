// Restrained, editorial accent colors for genres (calm, earthy, data-driven)
export const GENRE_PALETTES: Record<string, { 
  bg: string; 
  border: string; 
  text: string; 
  dot: string;
  darkBg: string;
  darkBorder: string;
  darkText: string;
}> = {
  // Electronic / House / Techno
  'Techno': { 
    bg: '#F0F9FD', border: '#C5E8F7', text: '#156184', dot: '#42C2F4',
    darkBg: '#0E1A22', darkBorder: '#1A3648', darkText: '#72D3F7'
  },
  'House': { 
    bg: '#FAF7F0', border: '#F0DEC1', text: '#6E4D1A', dot: '#F0B859',
    darkBg: '#1E1810', darkBorder: '#42331C', darkText: '#F5CE8A'
  },
  'Psytrance': { 
    bg: '#F8F2FA', border: '#E7C8EF', text: '#64217D', dot: '#BA68C8',
    darkBg: '#1B1122', darkBorder: '#3F1E4E', darkText: '#D998E5'
  },
  'Trance': { 
    bg: '#F0F7FB', border: '#C9E3F3', text: '#21527A', dot: '#6EC5E9',
    darkBg: '#101B24', darkBorder: '#1D3B51', darkText: '#9AD6F1'
  },
  'Breakbeat': { 
    bg: '#FAF3F0', border: '#F2D3C8', text: '#7E301A', dot: '#E66840',
    darkBg: '#211310', darkBorder: '#472217', darkText: '#F09477'
  },
  'Nu Disco': { 
    bg: '#FAF1F4', border: '#F3CCD7', text: '#79213B', dot: '#E56B8F',
    darkBg: '#211117', darkBorder: '#451D29', darkText: '#EE96B0'
  },
  'Ambient': { 
    bg: '#F0F9F6', border: '#C4E9DF', text: '#155B49', dot: '#48C0A3',
    darkBg: '#0F1E19', darkBorder: '#1A3C33', darkText: '#76D7BF'
  },
  'Progressive House': { 
    bg: '#F2F5FB', border: '#CAD7F2', text: '#2D447B', dot: '#7395D8',
    darkBg: '#121724', darkBorder: '#233355', darkText: '#9EB8EC'
  },
  'Synth-pop': { 
    bg: '#F9F1F7', border: '#F0CBE7', text: '#701E55', dot: '#D35BAA',
    darkBg: '#20101C', darkBorder: '#441B3B', darkText: '#E38DC6'
  },
  'Alternative Dance': { 
    bg: '#F4F3FC', border: '#D3D0F7', text: '#3E3486', dot: '#857CE6',
    darkBg: '#151325', darkBorder: '#2B2551', darkText: '#ABA4F2'
  },
  'Electronic': { 
    bg: '#F1F9FB', border: '#C7EBF3', text: '#1E5868', dot: '#76D5E8',
    darkBg: '#0F1B20', darkBorder: '#1C3A44', darkText: '#99E3F2'
  },
  
  // Indie / Alternative / Rock
  'Indie Rock': { 
    bg: '#F2F5F0', border: '#D2DDCB', text: '#3B5832', dot: '#527349',
    darkBg: '#161F13', darkBorder: '#2B3F24', darkText: '#9DC490'
  },
  'Alternative Rock': { 
    bg: '#F5F2F4', border: '#DED3DC', text: '#573D54', dot: '#745470',
    darkBg: '#221620', darkBorder: '#422B3E', darkText: '#D2B3CE'
  },
  'Post-Punk Revival': { 
    bg: '#F7F0F0', border: '#E5CDCD', text: '#773333', dot: '#974747',
    darkBg: '#261313', darkBorder: '#4C2424', darkText: '#E69E9E'
  },
  'Indie Pop': { 
    bg: '#EFF5F2', border: '#CDE0D5', text: '#2F5943', dot: '#44755C',
    darkBg: '#13211A', darkBorder: '#254233', darkText: '#93CBB0'
  },

  // Hip Hop / Jazz / Eclectic
  'Hip Hop': { 
    bg: '#F8F4EE', border: '#E4D5BE', text: '#6D4E22', dot: '#8C6734',
    darkBg: '#241C10', darkBorder: '#48371E', darkText: '#DEC08F'
  },
  'Jazz': { 
    bg: '#F6F3EE', border: '#DED4C5', text: '#634E35', dot: '#7F674C',
    darkBg: '#221A13', darkBorder: '#433425', darkText: '#D7BEA2'
  },
  'Trip Hop': { 
    bg: '#F0F1F5', border: '#D1D4DF', text: '#383F59', dot: '#50597A',
    darkBg: '#151722', darkBorder: '#2B2F45', darkText: '#A3ABCB'
  },
  'IDM': { 
    bg: '#EFF4F4', border: '#CCDADA', text: '#2D5454', dot: '#54C5C5',
    darkBg: '#131E1E', darkBorder: '#243C3C', darkText: '#76D5D5'
  },
  'French House': { 
    bg: '#F8F1F3', border: '#EAD2D8', text: '#753549', dot: '#E06D94',
    darkBg: '#261319', darkBorder: '#4B2531', darkText: '#ECA0BA'
  },
  'R&B': { 
    bg: '#F8F1F0', border: '#EAD0CE', text: '#783533', dot: '#D96560',
    darkBg: '#261312', darkBorder: '#4B2423', darkText: '#EA9A96'
  },
};

// Fallback dynamic generator supporting dark mode
export const getGenreColor = (genre: string = 'Other', isDark: boolean = false) => {
  if (GENRE_PALETTES[genre]) {
    const p = GENRE_PALETTES[genre];
    if (isDark) {
      return {
        bg: p.darkBg,
        border: p.darkBorder,
        text: p.darkText,
        dot: p.dot
      };
    }
    return {
      bg: p.bg,
      border: p.border,
      text: p.text,
      dot: p.dot
    };
  }

  let hash = 0;
  for (let i = 0; i < genre.length; i++) {
    hash = genre.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);

  if (isDark) {
    return {
      bg: `hsl(${hue}, 25%, 11%)`,
      border: `hsl(${hue}, 28%, 22%)`,
      text: `hsl(${hue}, 45%, 75%)`,
      dot: `hsl(${hue}, 40%, 55%)`,
    };
  }

  return {
    bg: `hsl(${hue}, 24%, 96%)`,
    border: `hsl(${hue}, 22%, 85%)`,
    text: `hsl(${hue}, 35%, 30%)`,
    dot: `hsl(${hue}, 35%, 45%)`,
  };
};

export const getMoodForTrack = (genre: string, bpm: number | null | undefined): string => {
  const g = (genre || '').toLowerCase();
  const b = bpm || 120;

  if (g.includes('techno') || b >= 140) return 'Intense';
  if (g.includes('trance') || g.includes('progressive') || (b >= 126 && b < 140)) return 'Uplifting';
  if (g.includes('disco') || g.includes('house') || g.includes('funk')) return 'Groovy';
  if (g.includes('ambient') || g.includes('jazz') || b < 95) return 'Calm';
  if (g.includes('trip hop') || g.includes('idm')) return 'Nocturnal';
  if (g.includes('indie rock') || g.includes('punk') || g.includes('alternative rock')) return 'Energetic';
  if (g.includes('synth-pop') || g.includes('dream')) return 'Nostalgic';
  if (g.includes('r&b') || g.includes('soul')) return 'Mellow';
  return 'Reflective';
};
