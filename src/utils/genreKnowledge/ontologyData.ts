/**
 * SymphonyGraph Local Genre Knowledge Engine - Ontology & Provenance
 *
 * DATA PROVENANCE & POLICY COMPLIANCE:
 * - SOURCE: Derived from Glenn McDonald's "Every Noise at Once" (everynoise.com)
 *   and open community taxonomy references (Scottsdaaale/List-of-All-Spotify-Genres,
 *   AyrtonB/EveryNoise-Watch, MusicBrainz open genre ontologies).
 * - LICENSE: Open public domain / MIT reference data.
 * - POLICY COMPLIANCE: In accordance with Spotify Developer Terms of Service,
 *   NO Spotify Platform data, user data, or personal listening history is used
 *   to train any machine-learning or AI model.
 * - NATURE: This is a DETERMINISTIC KNOWLEDGE LOOKUP TABLE and morphological
 *   graph ontology, NOT an artificial intelligence or machine-learning model.
 */

export interface GenreOntologyEntry {
  canonical: string;
  subgenre: string;
  cluster: string;
  affinityWeight?: number;
}

/**
 * Curated catalog homonym collisions registry.
 * Strictly documented cases where upstream streaming providers have merged distinct artists.
 */
export const CATALOG_COLLISIONS: Record<string, { canonical: string; subgenre: string; reason: string }> = {
  'guinea pigs': {
    canonical: 'Psytrance',
    subgenre: 'Dark Psytrance',
    reason: 'Apple Music/iTunes entity #191215671 conflates Israeli psytrance duo (Avi & Shalom Sagges) with country artist',
  },
};

/**
 * Deterministic canonical specificity weights.
 * Higher specificity weight ensures fine-grained subgenres take precedence over broad umbrellas.
 */
export const CANONICAL_SPECIFICITY_WEIGHTS: Record<string, number> = {
  'Psytrance': 95,
  'R&B': 90,
  'French House': 88,
  'Nu Disco': 87,
  'Progressive House': 86,
  'Breakbeat': 85,
  'IDM': 85,
  'Trip Hop': 85,
  'Techno': 85,
  'Metal': 85,
  'Hip Hop': 85,
  'Jazz': 85,
  'Classical': 85,
  'Post-Punk Revival': 85,
  'Reggae': 85,
  'Synth-pop': 82,
  'Alternative Dance': 81,
  'Trance': 80,
  'House': 80,
  'Indie Rock': 80,
  'Ambient': 80,
  'Country': 80,
  'Latin': 80,
  'Blues': 80,
  'Alternative Rock': 78,
  'Indie Pop': 75,
  'Folk': 75,
  'Rock': 65,
  'Electronic': 50,
  'Pop': 45,
};

/**
 * Morphological compound rules for Every Noise microgenres.
 * Every Noise constructs thousands of microgenres through systematic compounding:
 * e.g., "ragatrance" = "raga" (Indian classical melodic framework) + "trance" -> Psytrance: Ragatrance
 * e.g., "darkpsy" = "dark" + "psy" -> Psytrance: Darkpsy
 * e.g., "hitech" = "high" + "tech" trance -> Psytrance: Hi-Tech
 */
export interface MorphologicalRule {
  pattern: RegExp;
  canonical: string;
  subgenreDeriver: (matched: string) => string;
  baseWeight: number;
}

export const MORPHOLOGICAL_RULES: MorphologicalRule[] = [
  // 1. Psytrance Compounds (High specificity to avoid generic Trance/Electronic)
  {
    pattern: /\b(raga|hindustani|indian)\s*trance\b/i,
    canonical: 'Psytrance',
    subgenreDeriver: () => 'Ragatrance',
    baseWeight: 96,
  },
  {
    pattern: /\b(hi-?tech|hitech)\b/i,
    canonical: 'Psytrance',
    subgenreDeriver: () => 'Hi-Tech',
    baseWeight: 95,
  },
  {
    pattern: /\b(dark\s?psy|darkpsy|psycore)\b/i,
    canonical: 'Psytrance',
    subgenreDeriver: (m) => (/psycore/i.test(m) ? 'Psycore' : 'Darkpsy'),
    baseWeight: 95,
  },
  {
    pattern: /\b(goa\s+trance|goa\s+psy|goa)\b/i,
    canonical: 'Psytrance',
    subgenreDeriver: () => 'Goa Trance',
    baseWeight: 95,
  },
  {
    pattern: /\b(forest\s+psy|zenonesque|suomisaundi|full-?on\s+psy|psychedelic\s+trance|psy-?trance)\b/i,
    canonical: 'Psytrance',
    subgenreDeriver: (m) => {
      if (/forest/i.test(m)) return 'Forest Psy';
      if (/zenonesque/i.test(m)) return 'Zenonesque';
      if (/suomisaundi/i.test(m)) return 'Suomisaundi';
      return 'Psychedelic Trance';
    },
    baseWeight: 95,
  },

  // 2. Trance Compounds
  {
    pattern: /\b(progressive\s+trance|uplifting\s+trance|vocal\s+trance|tech\s+trance|acid\s+trance|hard\s+trance|euro\s+trance|dream\s+trance|trancecore)\b/i,
    canonical: 'Trance',
    subgenreDeriver: (m) => {
      if (/progressive/i.test(m)) return 'Progressive Trance';
      if (/uplifting/i.test(m)) return 'Uplifting Trance';
      if (/vocal/i.test(m)) return 'Vocal Trance';
      if (/tech/i.test(m)) return 'Tech Trance';
      if (/acid/i.test(m)) return 'Acid Trance';
      return 'Trance';
    },
    baseWeight: 82,
  },

  // 3. R&B and Soul Compounds (High specificity to prevent absorption into generic Pop)
  {
    pattern: /\b(contemporary\s+r&b|alternative\s+r&b|neo\s+soul|urban\s+contemporary|trap\s+soul|rhythm\s+and\s+blues|chill\s+r&b|indie\s+r&b|quiet\s+storm|motown|classic\s+soul)\b/i,
    canonical: 'R&B',
    subgenreDeriver: (m) => {
      if (/alternative\s+r&b/i.test(m)) return 'Alternative R&B';
      if (/contemporary\s+r&b/i.test(m)) return 'Contemporary R&B';
      if (/neo\s+soul/i.test(m)) return 'Neo Soul';
      if (/trap\s+soul/i.test(m)) return 'Trap Soul';
      if (/soul/i.test(m)) return 'Soul';
      return 'Contemporary R&B';
    },
    baseWeight: 92,
  },

  // 4. Techno Compounds
  {
    pattern: /\b(acid\s+techno|industrial\s+techno|schranz|peak\s+time\s+techno|minimal\s+techno|dub\s+techno|hard\s+techno|berlin\s+sound)\b/i,
    canonical: 'Techno',
    subgenreDeriver: (m) => {
      if (/acid/i.test(m)) return 'Acid Techno';
      if (/industrial/i.test(m)) return 'Industrial Techno';
      if (/schranz/i.test(m)) return 'Schranz';
      if (/minimal/i.test(m)) return 'Minimal Techno';
      return 'Techno';
    },
    baseWeight: 88,
  },

  // 5. House & French House
  {
    pattern: /\b(french\s+house|french\s+touch|filter\s+house|disco\s+house)\b/i,
    canonical: 'French House',
    subgenreDeriver: () => 'French House',
    baseWeight: 89,
  },
  {
    pattern: /\b(progressive\s+house|melodic\s+house)\b/i,
    canonical: 'Progressive House',
    subgenreDeriver: () => 'Progressive House',
    baseWeight: 87,
  },
  {
    pattern: /\b(deep\s+house|tech\s+house|electro\s+house|chicago\s+house|acid\s+house|club\s+house)\b/i,
    canonical: 'House',
    subgenreDeriver: (m) => {
      if (/deep/i.test(m)) return 'Deep House';
      if (/tech/i.test(m)) return 'Tech House';
      return 'House';
    },
    baseWeight: 82,
  },

  // 6. Hip Hop & Rap
  {
    pattern: /\b(hip\s*hop|rap|trap|drill|boom\s+bap|gangsta\s+rap|conscious\s+hip\s+hop|east\s+coast|west\s+coast)\b/i,
    canonical: 'Hip Hop',
    subgenreDeriver: (m) => {
      if (/trap/i.test(m)) return 'Trap';
      if (/drill/i.test(m)) return 'Drill';
      if (/boom\s+bap/i.test(m)) return 'Boom Bap';
      return 'Hip Hop';
    },
    baseWeight: 86,
  },

  // 7. Breakbeat & UK Bass
  {
    pattern: /\b(breakbeat|breaks|uk\s+bass|drum\s+and\s+bass|dnb|jungle|dubstep|uk\s+garage|2-step)\b/i,
    canonical: 'Breakbeat',
    subgenreDeriver: (m) => {
      if (/drum\s+and\s+bass|dnb/i.test(m)) return 'Drum & Bass';
      if (/jungle/i.test(m)) return 'Jungle';
      if (/dubstep/i.test(m)) return 'Dubstep';
      if (/uk\s+bass/i.test(m)) return 'UK Bass';
      return 'Breakbeat';
    },
    baseWeight: 86,
  },

  // 8. IDM & Trip Hop
  {
    pattern: /\b(idm|braindance|intelligent\s+dance\s+music|glitch)\b/i,
    canonical: 'IDM',
    subgenreDeriver: () => 'IDM',
    baseWeight: 86,
  },
  {
    pattern: /\b(trip\s+hop|bristol\s+sound|downtempo)\b/i,
    canonical: 'Trip Hop',
    subgenreDeriver: () => 'Trip Hop',
    baseWeight: 86,
  },

  // 9. Metal & Rock
  {
    pattern: /\b(heavy\s+metal|death\s+metal|black\s+metal|thrash\s+metal|metalcore|nu\s+metal|doom\s+metal)\b/i,
    canonical: 'Metal',
    subgenreDeriver: () => 'Metal',
    baseWeight: 87,
  },
  {
    pattern: /\b(post-punk|post-punk\s+revival|garage\s+rock\s+revival|goth\s+rock)\b/i,
    canonical: 'Post-Punk Revival',
    subgenreDeriver: () => 'Post-Punk',
    baseWeight: 86,
  },
  {
    pattern: /\b(indie\s+rock|oxford\s+indie|sheffield\s+indie)\b/i,
    canonical: 'Indie Rock',
    subgenreDeriver: () => 'Indie Rock',
    baseWeight: 82,
  },
  {
    pattern: /\b(alternative\s+rock|grunge|britpop|art\s+rock|permanent\s+wave|modern\s+rock)\b/i,
    canonical: 'Alternative Rock',
    subgenreDeriver: () => 'Alternative Rock',
    baseWeight: 80,
  },

  // 10. Country & Folk (Strict regex - NEVER a default)
  {
    pattern: /\b(country|bluegrass|americana|outlaw\s+country|alt-country|nashville\s+sound)\b/i,
    canonical: 'Country',
    subgenreDeriver: () => 'Country',
    baseWeight: 82,
  },
  {
    pattern: /\b(folk|acoustic\s+folk|singer-songwriter)\b/i,
    canonical: 'Folk',
    subgenreDeriver: () => 'Folk',
    baseWeight: 76,
  },
];

/**
 * Compact Every Noise Microgenre Reference Map.
 * Provides deterministic canonical resolution for fine-grained Every Noise tags
 * that might otherwise be ambiguous or lack clear word boundaries.
 */
export const EVERY_NOISE_MICROGENRE_MAP: Record<string, [canonical: string, subgenre: string]> = {
  // Psytrance & Trance variants
  'ragatrance': ['Psytrance', 'Ragatrance'],
  'raga trance': ['Psytrance', 'Ragatrance'],
  'darkpsy': ['Psytrance', 'Darkpsy'],
  'deep darkpsy': ['Psytrance', 'Darkpsy'],
  'hitech': ['Psytrance', 'Hi-Tech'],
  'hi-tech': ['Psytrance', 'Hi-Tech'],
  'psycore': ['Psytrance', 'Psycore'],
  'goa trance': ['Psytrance', 'Goa Trance'],
  'goa psytrance': ['Psytrance', 'Goa Trance'],
  'deep psytrance': ['Psytrance', 'Psychedelic Trance'],
  'progressive psytrance': ['Psytrance', 'Progressive Psytrance'],
  'forest psytrance': ['Psytrance', 'Forest Psy'],
  'zenonesque': ['Psytrance', 'Zenonesque'],
  'suomisaundi': ['Psytrance', 'Suomisaundi'],
  'full on': ['Psytrance', 'Full-On'],
  'full-on': ['Psytrance', 'Full-On'],
  'psychill': ['Psytrance', 'Psychill'],
  'ambient psychill': ['Ambient', 'Psychill'],
  'uplifting trance': ['Trance', 'Uplifting Trance'],
  'progressive trance': ['Trance', 'Progressive Trance'],
  'tech trance': ['Trance', 'Tech Trance'],
  'acid trance': ['Trance', 'Acid Trance'],
  'vocal trance': ['Trance', 'Vocal Trance'],
  'dream trance': ['Trance', 'Dream Trance'],
  'trancecore': ['Trance', 'Trancecore'],

  // R&B & Soul variants
  'contemporary r&b': ['R&B', 'Contemporary R&B'],
  'alternative r&b': ['R&B', 'Alternative R&B'],
  'neo soul': ['R&B', 'Neo Soul'],
  'urban contemporary': ['R&B', 'Contemporary R&B'],
  'trap soul': ['R&B', 'Trap Soul'],
  'quiet storm': ['R&B', 'Quiet Storm'],
  'indie r&b': ['R&B', 'Indie R&B'],
  'chill r&b': ['R&B', 'Chill R&B'],
  'classic soul': ['R&B', 'Classic Soul'],
  'motown': ['R&B', 'Motown'],
  'southern soul': ['R&B', 'Southern Soul'],
  'philly soul': ['R&B', 'Philly Soul'],
  'chicago soul': ['R&B', 'Chicago Soul'],
  'british soul': ['R&B', 'British Soul'],

  // Techno & Industrial
  'acid techno': ['Techno', 'Acid Techno'],
  'industrial techno': ['Techno', 'Industrial Techno'],
  'schranz': ['Techno', 'Schranz'],
  'minimal techno': ['Techno', 'Minimal Techno'],
  'dub techno': ['Techno', 'Dub Techno'],
  'hard techno': ['Techno', 'Hard Techno'],
  'peak time techno': ['Techno', 'Peak Time Techno'],

  // House variants
  'french house': ['French House', 'French House'],
  'french touch': ['French House', 'French House'],
  'filter house': ['French House', 'Filter House'],
  'disco house': ['French House', 'Disco House'],
  'nu disco': ['Nu Disco', 'Nu Disco'],
  'space disco': ['Nu Disco', 'Space Disco'],
  'italo disco': ['Nu Disco', 'Italo Disco'],
  'deep house': ['House', 'Deep House'],
  'tech house': ['House', 'Tech House'],
  'electro house': ['House', 'Electro House'],
  'progressive house': ['Progressive House', 'Progressive House'],
  'melodic house': ['Progressive House', 'Melodic House'],

  // Hip Hop & Rap
  'boom bap': ['Hip Hop', 'Boom Bap'],
  'trap': ['Hip Hop', 'Trap'],
  'drill': ['Hip Hop', 'Drill'],
  'conscious hip hop': ['Hip Hop', 'Conscious Hip Hop'],
  'gangsta rap': ['Hip Hop', 'Gangsta Rap'],
  'east coast hip hop': ['Hip Hop', 'East Coast'],
  'west coast rap': ['Hip Hop', 'West Coast'],
  'hardcore hip hop': ['Hip Hop', 'Hardcore Rap'],

  // Bass & Breakbeat
  'drum and bass': ['Breakbeat', 'Drum & Bass'],
  'dnb': ['Breakbeat', 'Drum & Bass'],
  'liquid funk': ['Breakbeat', 'Liquid Funk'],
  'jungle': ['Breakbeat', 'Jungle'],
  'breakbeat': ['Breakbeat', 'Breakbeat'],
  'uk bass': ['Breakbeat', 'UK Bass'],
  'dubstep': ['Breakbeat', 'Dubstep'],
  'uk garage': ['Breakbeat', 'UK Garage'],
  '2-step': ['Breakbeat', '2-Step'],
  'grime': ['Breakbeat', 'Grime'],

  // Electronic & IDM
  'idm': ['IDM', 'IDM'],
  'braindance': ['IDM', 'Braindance'],
  'intelligent dance music': ['IDM', 'IDM'],
  'glitch': ['IDM', 'Glitch'],
  'trip hop': ['Trip Hop', 'Trip Hop'],
  'downtempo': ['Trip Hop', 'Downtempo'],
  'ambient': ['Ambient', 'Ambient'],
  'drone': ['Ambient', 'Drone'],
  'dark ambient': ['Ambient', 'Dark Ambient'],
  'ambient techno': ['Ambient', 'Ambient Techno'],

  // Synth & Indie Pop
  'synthwave': ['Synth-pop', 'Synthwave'],
  'new wave': ['Synth-pop', 'New Wave'],
  'darkwave': ['Synth-pop', 'Darkwave'],
  'electropop': ['Synth-pop', 'Electropop'],
  'dance-punk': ['Alternative Dance', 'Dance-Punk'],
  'electroclash': ['Alternative Dance', 'Electroclash'],
  'indie pop': ['Indie Pop', 'Indie Pop'],
  'chamber pop': ['Indie Pop', 'Chamber Pop'],

  // Rock & Metal
  'post-punk': ['Post-Punk Revival', 'Post-Punk'],
  'post-punk revival': ['Post-Punk Revival', 'Post-Punk Revival'],
  'garage rock': ['Rock', 'Garage Rock'],
  'indie rock': ['Indie Rock', 'Indie Rock'],
  'grunge': ['Alternative Rock', 'Grunge'],
  'britpop': ['Alternative Rock', 'Britpop'],
  'shoegaze': ['Alternative Rock', 'Shoegaze'],
  'dream pop': ['Alternative Rock', 'Dream Pop'],
  'heavy metal': ['Metal', 'Heavy Metal'],
  'death metal': ['Metal', 'Death Metal'],
  'black metal': ['Metal', 'Black Metal'],
  'thrash metal': ['Metal', 'Thrash Metal'],
  'metalcore': ['Metal', 'Metalcore'],
  'nu metal': ['Metal', 'Nu Metal'],

  // Country, Folk, Classical, Jazz
  'bluegrass': ['Country', 'Bluegrass'],
  'americana': ['Country', 'Americana'],
  'outlaw country': ['Country', 'Outlaw Country'],
  'alt-country': ['Country', 'Alt-Country'],
  'acoustic folk': ['Folk', 'Acoustic Folk'],
  'bebop': ['Jazz', 'Bebop'],
  'hard bop': ['Jazz', 'Hard Bop'],
  'modal jazz': ['Jazz', 'Modal Jazz'],
  'baroque': ['Classical', 'Baroque'],
  'symphony': ['Classical', 'Symphony'],
  'reggae': ['Reggae', 'Reggae'],
  'dancehall': ['Reggae', 'Dancehall'],
  'roots reggae': ['Reggae', 'Roots Reggae'],
  'dub': ['Reggae', 'Dub'],
  'reggaeton': ['Latin', 'Reggaeton'],
  'salsa': ['Latin', 'Salsa'],
  'bachata': ['Latin', 'Bachata'],
  'cumbia': ['Latin', 'Cumbia'],
  'delta blues': ['Blues', 'Delta Blues'],
  'electric blues': ['Blues', 'Electric Blues'],

  // Base canonical genres & umbrellas
  'psytrance': ['Psytrance', 'Psychedelic Trance'],
  'trance': ['Trance', 'Trance'],
  'r&b': ['R&B', 'Contemporary R&B'],
  'rnb': ['R&B', 'Contemporary R&B'],
  'pop': ['Pop', 'Pop'],
  'dance pop': ['Pop', 'Dance Pop'],
  'techno': ['Techno', 'Techno'],
  'house': ['House', 'House'],
  'hip hop': ['Hip Hop', 'Hip Hop'],
  'rap': ['Hip Hop', 'Rap'],
  'rock': ['Rock', 'Rock'],
  'metal': ['Metal', 'Metal'],
  'country': ['Country', 'Country'],
  'folk': ['Folk', 'Folk'],
  'jazz': ['Jazz', 'Jazz'],
  'classical': ['Classical', 'Classical'],
  'orchestral': ['Classical', 'Orchestral'],
  'breaks': ['Breakbeat', 'Breaks'],
  'electronic': ['Electronic', 'Electronic'],
  'electronica': ['Electronic', 'Electronica'],
  'edm': ['Electronic', 'EDM'],
  'dance': ['Electronic', 'Dance'],
  'synth': ['Electronic', 'Synth'],
};
