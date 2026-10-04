// Centralized Celestial Color & Material System
// Translates music genres into restrained, astronomical color identities.
// Palette rationale:
// - Non-neon, atmospheric, deep-space celestial tones.
// - High dynamic range: brilliant star core -> luminous chromatic halo -> deep dark space falloff.

export interface CelestialColorIdentity {
  primary: string;       // Core stellar tint (hex)
  secondary: string;     // Halo / corona atmospheric hue (hex)
  glowRgb: string;       // "r, g, b" string for alpha blending
  coreRgb: string;       // Bright core color (usually warm white/tinted)
  dustRgb: string;       // Subtle orbital dust tone
  temperature: 'cool' | 'warm' | 'neutral' | 'hyper';
}

export const GENRE_CELESTIAL_COLORS: Record<string, CelestialColorIdentity> = {
  // Techno: Electric Blue / Cyan
  'Techno': {
    primary: '#42C2F4',
    secondary: '#1A7AAB',
    glowRgb: '50, 160, 230',
    coreRgb: '225, 245, 255',
    dustRgb: '30, 95, 140',
    temperature: 'cool',
  },
  // House: Warm Amber / Gold
  'House': {
    primary: '#F0B859',
    secondary: '#B57827',
    glowRgb: '235, 165, 65',
    coreRgb: '255, 248, 230',
    dustRgb: '130, 85, 30',
    temperature: 'warm',
  },
  // Psytrance / Trance: Violet / Magenta / Icy Blue
  'Psytrance': {
    primary: '#BA68C8',
    secondary: '#7B2C9A',
    glowRgb: '175, 80, 205',
    coreRgb: '250, 235, 255',
    dustRgb: '90, 35, 115',
    temperature: 'hyper',
  },
  'Trance': {
    primary: '#6EC5E9',
    secondary: '#6758B5',
    glowRgb: '95, 145, 235',
    coreRgb: '235, 248, 255',
    dustRgb: '45, 70, 130',
    temperature: 'cool',
  },
  // Breakbeat: Red-Orange / Stellar Flare
  'Breakbeat': {
    primary: '#E66840',
    secondary: '#9E381A',
    glowRgb: '225, 95, 55',
    coreRgb: '255, 238, 230',
    dustRgb: '120, 45, 25',
    temperature: 'warm',
  },
  // Nu Disco: Pink / Coral
  'Nu Disco': {
    primary: '#E56B8F',
    secondary: '#9C3352',
    glowRgb: '225, 100, 135',
    coreRgb: '255, 240, 245',
    dustRgb: '115, 38, 62',
    temperature: 'warm',
  },
  // Ambient: Teal / Cyan-Green / Deep Nebula
  'Ambient': {
    primary: '#48C0A3',
    secondary: '#206A58',
    glowRgb: '65, 185, 155',
    coreRgb: '230, 255, 250',
    dustRgb: '25, 85, 70',
    temperature: 'cool',
  },
  // Progressive House: Cool Blue / Lavender
  'Progressive House': {
    primary: '#7395D8',
    secondary: '#574A96',
    glowRgb: '105, 135, 215',
    coreRgb: '240, 245, 255',
    dustRgb: '50, 65, 120',
    temperature: 'cool',
  },
  // Synth-pop: Magenta / Violet
  'Synth-pop': {
    primary: '#D35BAA',
    secondary: '#802B6D',
    glowRgb: '205, 85, 165',
    coreRgb: '255, 238, 250',
    dustRgb: '100, 35, 85',
    temperature: 'hyper',
  },
  // Alternative Dance: Deep Purple / Blue
  'Alternative Dance': {
    primary: '#857CE6',
    secondary: '#4A3E99',
    glowRgb: '125, 115, 225',
    coreRgb: '242, 240, 255',
    dustRgb: '58, 48, 125',
    temperature: 'cool',
  },
  // Electronic: Blue-White / Cyan
  'Electronic': {
    primary: '#76D5E8',
    secondary: '#2E8099',
    glowRgb: '90, 195, 220',
    coreRgb: '240, 253, 255',
    dustRgb: '35, 95, 115',
    temperature: 'cool',
  },
  // Indie Rock: Forest Emerald / Moss Star
  'Indie Rock': {
    primary: '#6BBF72',
    secondary: '#36693C',
    glowRgb: '95, 180, 105',
    coreRgb: '238, 255, 240',
    dustRgb: '40, 85, 45',
    temperature: 'neutral',
  },
  // Alternative Rock: Dusky Plum / Violet-Grey
  'Alternative Rock': {
    primary: '#AF76A5',
    secondary: '#693C62',
    glowRgb: '165, 105, 155',
    coreRgb: '250, 240, 248',
    dustRgb: '85, 45, 80',
    temperature: 'neutral',
  },
  // Post-Punk Revival: Crimson / Iron
  'Post-Punk Revival': {
    primary: '#D95858',
    secondary: '#852929',
    glowRgb: '210, 80, 80',
    coreRgb: '255, 240, 240',
    dustRgb: '110, 35, 35',
    temperature: 'warm',
  },
  // Indie Pop: Mint Sage / Spring Celestine
  'Indie Pop': {
    primary: '#5BC296',
    secondary: '#2E7353',
    glowRgb: '85, 185, 140',
    coreRgb: '235, 255, 245',
    dustRgb: '35, 90, 65',
    temperature: 'neutral',
  },
  // Hip Hop: Burnished Copper / Amber
  'Hip Hop': {
    primary: '#DCA258',
    secondary: '#8F5E24',
    glowRgb: '215, 150, 75',
    coreRgb: '255, 248, 235',
    dustRgb: '115, 75, 30',
    temperature: 'warm',
  },
  // Jazz: Smoked Topaz / Warm Ochre
  'Jazz': {
    primary: '#C8A26A',
    secondary: '#7A5B30',
    glowRgb: '195, 150, 95',
    coreRgb: '255, 250, 240',
    dustRgb: '100, 72, 38',
    temperature: 'warm',
  },
  // Trip Hop: Deep Indigo / Shadow Blue
  'Trip Hop': {
    primary: '#7083B8',
    secondary: '#3B4A78',
    glowRgb: '105, 125, 180',
    coreRgb: '240, 244, 255',
    dustRgb: '45, 58, 95',
    temperature: 'cool',
  },
  // IDM: Crystalline Cyan / Aqua
  'IDM': {
    primary: '#54C5C5',
    secondary: '#257474',
    glowRgb: '75, 190, 190',
    coreRgb: '235, 255, 255',
    dustRgb: '30, 90, 90',
    temperature: 'cool',
  },
  // French House: Rose Gold / Coral Violet
  'French House': {
    primary: '#E06D94',
    secondary: '#8C3554',
    glowRgb: '220, 100, 140',
    coreRgb: '255, 242, 248',
    dustRgb: '110, 40, 68',
    temperature: 'warm',
  },
  // R&B: Deep Scarlet / Sunset Rose
  'R&B': {
    primary: '#D96560',
    secondary: '#88312D',
    glowRgb: '210, 95, 90',
    coreRgb: '255, 242, 240',
    dustRgb: '110, 40, 38',
    temperature: 'warm',
  },
  // Rock: Crimson / Iron Stone
  'Rock': {
    primary: '#CF5A5A',
    secondary: '#7D2929',
    glowRgb: '200, 85, 85',
    coreRgb: '255, 242, 242',
    dustRgb: '100, 35, 35',
    temperature: 'warm',
  },
  // Metal: Dark Silver / Obsidian Slate
  'Metal': {
    primary: '#9E9EA8',
    secondary: '#575761',
    glowRgb: '150, 150, 160',
    coreRgb: '245, 245, 250',
    dustRgb: '65, 65, 75',
    temperature: 'cool',
  },
  // Pop: Radiant Rose / Vibrant Pink
  'Pop': {
    primary: '#E868A2',
    secondary: '#962B62',
    glowRgb: '230, 95, 155',
    coreRgb: '255, 242, 248',
    dustRgb: '115, 35, 75',
    temperature: 'hyper',
  },
  // Classical: Solar Ivory / Warm Pearl
  'Classical': {
    primary: '#E6DEC8',
    secondary: '#91866B',
    glowRgb: '220, 210, 190',
    coreRgb: '255, 253, 248',
    dustRgb: '110, 100, 80',
    temperature: 'neutral',
  },
  // Country: Warm Leather / Sunlit Copper
  'Country': {
    primary: '#C68B59',
    secondary: '#7A4D27',
    glowRgb: '190, 130, 75',
    coreRgb: '255, 248, 240',
    dustRgb: '95, 60, 28',
    temperature: 'warm',
  },
  // Folk: Woodland Olive / Forest Amber
  'Folk': {
    primary: '#8EA85F',
    secondary: '#4D612B',
    glowRgb: '135, 160, 85',
    coreRgb: '248, 255, 240',
    dustRgb: '65, 80, 35',
    temperature: 'neutral',
  },
  // Reggae: Sunlit Emerald / Gold
  'Reggae': {
    primary: '#5CB874',
    secondary: '#286B3B',
    glowRgb: '85, 175, 110',
    coreRgb: '238, 255, 242',
    dustRgb: '35, 85, 45',
    temperature: 'warm',
  },
  // Latin: Vibrant Sunset Amber
  'Latin': {
    primary: '#E08443',
    secondary: '#8F4818',
    glowRgb: '220, 125, 60',
    coreRgb: '255, 245, 235',
    dustRgb: '110, 55, 20',
    temperature: 'warm',
  },
  // Blues: Deep Cobalt / Indigo
  'Blues': {
    primary: '#4E7BC7',
    secondary: '#254580',
    glowRgb: '70, 115, 195',
    coreRgb: '238, 245, 255',
    dustRgb: '30, 55, 100',
    temperature: 'cool',
  },
  // Unknown: Nebular Slate / Muted Dust
  'Unknown': {
    primary: '#7D8597',
    secondary: '#404552',
    glowRgb: '115, 122, 140',
    coreRgb: '240, 242, 246',
    dustRgb: '50, 54, 62',
    temperature: 'neutral',
  },
};

// Fallback dynamic celestial color for arbitrary or unknown genres
export function getCelestialGenreColor(genreName: string = 'Electronic'): CelestialColorIdentity {
  const normalized = Object.keys(GENRE_CELESTIAL_COLORS).find(
    (k) => k.toLowerCase() === genreName.trim().toLowerCase()
  );
  if (normalized) {
    return GENRE_CELESTIAL_COLORS[normalized];
  }

  // Deterministic celestial hue hash with balanced saturation & brightness
  let hash = 0;
  for (let i = 0; i < genreName.length; i++) {
    hash = genreName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  
  // Convert HSL to RGB approximation
  const s = 0.65;
  const l = 0.58;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (hue < 60) { r = c; g = x; b = 0; }
  else if (hue < 120) { r = x; g = c; b = 0; }
  else if (hue < 180) { r = 0; g = c; b = x; }
  else if (hue < 240) { r = 0; g = x; b = c; }
  else if (hue < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const rgbR = Math.round((r + m) * 255);
  const rgbG = Math.round((g + m) * 255);
  const rgbB = Math.round((b + m) * 255);

  const hex = `#${((1 << 24) + (rgbR << 16) + (rgbG << 8) + rgbB).toString(16).slice(1)}`;
  const secR = Math.round(rgbR * 0.55);
  const secG = Math.round(rgbG * 0.55);
  const secB = Math.round(rgbB * 0.55);
  const secHex = `#${((1 << 24) + (secR << 16) + (secG << 8) + secB).toString(16).slice(1)}`;

  return {
    primary: hex,
    secondary: secHex,
    glowRgb: `${rgbR}, ${rgbG}, ${rgbB}`,
    coreRgb: '245, 250, 255',
    dustRgb: `${Math.round(rgbR * 0.4)}, ${Math.round(rgbG * 0.4)}, ${Math.round(rgbB * 0.4)}`,
    temperature: hue > 30 && hue < 90 ? 'warm' : 'cool',
  };
}
