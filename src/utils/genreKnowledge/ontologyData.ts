/**
 * SymphonyGraph Local Genre Knowledge Engine - Ontology & Provenance
 *
 * DATA PROVENANCE & POLICY COMPLIANCE:
 * - SOURCE: Glenn McDonald's "Every Noise at Once" (everynoise.com) and open community
 *   taxonomies (MusicBrainz, Discogs, Scottsdaaale/List-of-All-Spotify-Genres, AyrtonB/EveryNoise-Watch).
 * - LICENSE: Open public domain / CC0 / MIT reference data.
 * - POLICY COMPLIANCE: In accordance with Spotify Developer Terms of Service,
 *   NO Spotify Platform data, user data, or personal listening history is used
 *   to train any machine-learning or AI model.
 * - NATURE: 100% deterministic lookup table, morphological compounding rules,
 *   and structured musicological graph.
 */

import { ARTIST_KNOWLEDGE_REGISTRY } from './artistKnowledge';

export interface GenreOntologyEntry {
  canonical: string;
  subgenre: string;
  cluster: string;
  affinityWeight?: number;
}

/**
 * Curated catalog homonym collisions registry.
 * Authoritative, unified source derived directly from ARTIST_KNOWLEDGE_REGISTRY.
 */
export const CATALOG_COLLISIONS: Record<string, { canonical: string; subgenre: string; reason: string }> = Object.fromEntries(
  Object.entries(ARTIST_KNOWLEDGE_REGISTRY)
    .filter(([, entry]) => Boolean(entry.collisionTarget))
    .map(([key, entry]) => [
      key,
      {
        canonical: entry.primaryCanonical,
        subgenre: entry.primarySubgenre,
        reason: entry.disambiguationNotes,
      },
    ])
);

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
    pattern: /\b(forest\s+psy|forest\s+psytrance|zenonesque|suomisaundi|full-?on\s+psy|full-?on|psychedelic\s+trance|psy-?trance)\b/i,
    canonical: 'Psytrance',
    subgenreDeriver: (m) => {
      if (/forest/i.test(m)) return 'Forest Psy';
      if (/zenonesque/i.test(m)) return 'Zenonesque';
      if (/suomisaundi/i.test(m)) return 'Suomisaundi';
      if (/full-?on/i.test(m)) return 'Full-On';
      return 'Psychedelic Trance';
    },
    baseWeight: 95,
  },

  // 2. Trance Compounds
  {
    pattern: /\b(progressive\s+trance|uplifting\s+trance|vocal\s+trance|tech\s+trance|acid\s+trance|hard\s+trance|euro\s+trance|dream\s+trance|trancecore|classic\s+trance)\b/i,
    canonical: 'Trance',
    subgenreDeriver: (m) => {
      if (/progressive/i.test(m)) return 'Progressive Trance';
      if (/uplifting/i.test(m)) return 'Uplifting Trance';
      if (/vocal/i.test(m)) return 'Vocal Trance';
      if (/tech/i.test(m)) return 'Tech Trance';
      if (/acid/i.test(m)) return 'Acid Trance';
      if (/dream/i.test(m)) return 'Dream Trance';
      return 'Trance';
    },
    baseWeight: 82,
  },

  // 3. R&B and Soul Compounds (High specificity to prevent absorption into generic Pop)
  {
    pattern: /\b(contemporary\s+r&b|alternative\s+r&b|neo\s+soul|urban\s+contemporary|trap\s+soul|rhythm\s+and\s+blues|chill\s+r&b|indie\s+r&b|quiet\s+storm|motown|classic\s+soul|r&b|rnb)\b/i,
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
    pattern: /\b(acid\s+techno|industrial\s+techno|schranz|peak\s+time\s+techno|minimal\s+techno|dub\s+techno|hard\s+techno|berlin\s+sound|detroit\s+techno)\b/i,
    canonical: 'Techno',
    subgenreDeriver: (m) => {
      if (/acid/i.test(m)) return 'Acid Techno';
      if (/industrial/i.test(m)) return 'Industrial Techno';
      if (/schranz/i.test(m)) return 'Schranz';
      if (/minimal/i.test(m)) return 'Minimal Techno';
      if (/dub/i.test(m)) return 'Dub Techno';
      return 'Techno';
    },
    baseWeight: 88,
  },

  // 5. House & French House & Nu Disco
  {
    pattern: /\b(french\s+house|french\s+touch|filter\s+house|disco\s+house)\b/i,
    canonical: 'French House',
    subgenreDeriver: () => 'French House',
    baseWeight: 89,
  },
  {
    pattern: /\b(nu\s+disco|space\s+disco|cosmic\s+disco|italo\s+disco)\b/i,
    canonical: 'Nu Disco',
    subgenreDeriver: () => 'Nu Disco',
    baseWeight: 88,
  },
  {
    pattern: /\b(progressive\s+house|melodic\s+house)\b/i,
    canonical: 'Progressive House',
    subgenreDeriver: () => 'Progressive House',
    baseWeight: 87,
  },
  {
    pattern: /\b(deep\s+house|tech\s+house|electro\s+house|chicago\s+house|acid\s+house|club\s+house|afro\s+house|gqom)\b/i,
    canonical: 'House',
    subgenreDeriver: (m) => {
      if (/deep/i.test(m)) return 'Deep House';
      if (/tech/i.test(m)) return 'Tech House';
      if (/electro/i.test(m)) return 'Electro House';
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
    pattern: /\b(breakbeat|breaks|uk\s+bass|drum\s+and\s+bass|dnb|jungle|dubstep|uk\s+garage|2-step|breakcore|neurofunk)\b/i,
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

  // 8. IDM & Trip Hop & Ambient
  {
    pattern: /\b(idm|braindance|intelligent\s+dance\s+music|glitch|drill\s+and\s+bass)\b/i,
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
  {
    pattern: /\b(ambient|drone|dark\s+ambient|ambient\s+techno)\b/i,
    canonical: 'Ambient',
    subgenreDeriver: () => 'Ambient',
    baseWeight: 81,
  },

  // 9. Synth-pop & Alternative Dance
  {
    pattern: /\b(synth-?pop|synthwave|new\s+wave|dark\s+wave|electropop)\b/i,
    canonical: 'Synth-pop',
    subgenreDeriver: () => 'Synth-pop',
    baseWeight: 83,
  },
  {
    pattern: /\b(alternative\s+dance|indie\s+dance|dance-punk|electroclash)\b/i,
    canonical: 'Alternative Dance',
    subgenreDeriver: () => 'Alternative Dance',
    baseWeight: 82,
  },

  // 10. Metal & Rock & Post-Punk
  {
    pattern: /\b(heavy\s+metal|death\s+metal|black\s+metal|thrash\s+metal|metalcore|nu\s+metal|doom\s+metal|sludge\s+metal)\b/i,
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
  {
    pattern: /\b(hard\s+rock|classic\s+rock|psychedelic\s+rock|garage\s+rock)\b/i,
    canonical: 'Rock',
    subgenreDeriver: () => 'Rock',
    baseWeight: 66,
  },

  // 11. Country & Folk (Strict regex - NEVER a default)
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

  // 12. Roots & Classical
  {
    pattern: /\b(jazz|bebop|hard\s+bop|modal\s+jazz|cool\s+jazz|jazz\s+fusion)\b/i,
    canonical: 'Jazz',
    subgenreDeriver: () => 'Jazz',
    baseWeight: 86,
  },
  {
    pattern: /\b(blues|delta\s+blues|electric\s+blues|chicago\s+blues)\b/i,
    canonical: 'Blues',
    subgenreDeriver: () => 'Blues',
    baseWeight: 82,
  },
  {
    pattern: /\b(classical|baroque|chamber|symphony|orchestral|romantic\s+classical)\b/i,
    canonical: 'Classical',
    subgenreDeriver: () => 'Classical',
    baseWeight: 86,
  },
  {
    pattern: /\b(reggae|dub|dancehall|roots\s+reggae|ska)\b/i,
    canonical: 'Reggae',
    subgenreDeriver: () => 'Reggae',
    baseWeight: 86,
  },
  {
    pattern: /\b(reggaeton|salsa|bachata|cumbia|latin\s+pop)\b/i,
    canonical: 'Latin',
    subgenreDeriver: () => 'Latin',
    baseWeight: 81,
  },
  {
    pattern: /\b(indie\s+pop|chamber\s+pop|bedroom\s+pop)\b/i,
    canonical: 'Indie Pop',
    subgenreDeriver: () => 'Indie Pop',
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
  'dark psy': ['Psytrance', 'Darkpsy'],
  'deep darkpsy': ['Psytrance', 'Darkpsy'],
  'hitech': ['Psytrance', 'Hi-Tech'],
  'hi-tech': ['Psytrance', 'Hi-Tech'],
  'hi tech': ['Psytrance', 'Hi-Tech'],
  'psycore': ['Psytrance', 'Psycore'],
  'goa trance': ['Psytrance', 'Goa Trance'],
  'goa psytrance': ['Psytrance', 'Goa Trance'],
  'goa': ['Psytrance', 'Goa Trance'],
  'deep psytrance': ['Psytrance', 'Psychedelic Trance'],
  'progressive psytrance': ['Psytrance', 'Progressive Psytrance'],
  'forest psytrance': ['Psytrance', 'Forest Psy'],
  'forest psy': ['Psytrance', 'Forest Psy'],
  'zenonesque': ['Psytrance', 'Zenonesque'],
  'suomisaundi': ['Psytrance', 'Suomisaundi'],
  'full on': ['Psytrance', 'Full-On'],
  'full-on': ['Psytrance', 'Full-On'],
  'full on psy': ['Psytrance', 'Full-On'],
  'full-on psy': ['Psytrance', 'Full-On'],
  'psychill': ['Psytrance', 'Psychill'],
  'psybient': ['Psytrance', 'Psychill'],
  'twilight psy': ['Psytrance', 'Twilight Psy'],
  'shamanic psytrance': ['Psytrance', 'Forest Psy'],
  'ambient psychill': ['Ambient', 'Psychill'],
  'uplifting trance': ['Trance', 'Uplifting Trance'],
  'progressive trance': ['Trance', 'Progressive Trance'],
  'tech trance': ['Trance', 'Tech Trance'],
  'acid trance': ['Trance', 'Acid Trance'],
  'vocal trance': ['Trance', 'Vocal Trance'],
  'dream trance': ['Trance', 'Dream Trance'],
  'trancecore': ['Trance', 'Trancecore'],
  'classic trance': ['Trance', 'Classic Trance'],
  'anthem trance': ['Trance', 'Anthem Trance'],
  'hard trance': ['Trance', 'Hard Trance'],
  'euro trance': ['Trance', 'Euro Trance'],

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
  'memphis soul': ['R&B', 'Memphis Soul'],
  'bedroom r&b': ['R&B', 'Contemporary R&B'],
  'retro soul': ['R&B', 'Soul'],
  'canadian contemporary r&b': ['R&B', 'Contemporary R&B'],

  // Techno & Industrial
  'acid techno': ['Techno', 'Acid Techno'],
  'industrial techno': ['Techno', 'Industrial Techno'],
  'schranz': ['Techno', 'Schranz'],
  'minimal techno': ['Techno', 'Minimal Techno'],
  'dub techno': ['Techno', 'Dub Techno'],
  'hard techno': ['Techno', 'Hard Techno'],
  'peak time techno': ['Techno', 'Peak Time Techno'],
  'detroit techno': ['Techno', 'Detroit Techno'],
  'melodic techno': ['Techno', 'Melodic Techno'],
  'dark techno': ['Techno', 'Dark Techno'],
  'berlin sound': ['Techno', 'Minimal Techno'],

  // House variants
  'french house': ['French House', 'French House'],
  'french touch': ['French House', 'French House'],
  'filter house': ['French House', 'Filter House'],
  'disco house': ['French House', 'Disco House'],
  'nu disco': ['Nu Disco', 'Nu Disco'],
  'space disco': ['Nu Disco', 'Space Disco'],
  'italo disco': ['Nu Disco', 'Italo Disco'],
  'cosmic disco': ['Nu Disco', 'Space Disco'],
  'deep house': ['House', 'Deep House'],
  'tech house': ['House', 'Tech House'],
  'electro house': ['House', 'Electro House'],
  'chicago house': ['House', 'Chicago House'],
  'acid house': ['House', 'Acid House'],
  'progressive house': ['Progressive House', 'Progressive House'],
  'melodic house': ['Progressive House', 'Melodic House'],
  'afro house': ['House', 'Afro House'],
  'gqom': ['House', 'Gqom'],
  'jackin house': ['House', 'Jackin House'],
  'soulful house': ['House', 'Soulful House'],

  // Hip Hop & Rap
  'boom bap': ['Hip Hop', 'Boom Bap'],
  'trap': ['Hip Hop', 'Trap'],
  'drill': ['Hip Hop', 'Drill'],
  'conscious hip hop': ['Hip Hop', 'Conscious Hip Hop'],
  'gangsta rap': ['Hip Hop', 'Gangsta Rap'],
  'east coast hip hop': ['Hip Hop', 'East Coast'],
  'west coast rap': ['Hip Hop', 'West Coast'],
  'hardcore hip hop': ['Hip Hop', 'Hardcore Rap'],
  'southern hip hop': ['Hip Hop', 'Southern Rap'],

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
  'breakcore': ['Breakbeat', 'Breakcore'],
  'neurofunk': ['Breakbeat', 'Neurofunk'],
  'ambient breaks': ['Breakbeat', 'Ambient Breaks'],

  // Electronic & IDM & Trip Hop
  'idm': ['IDM', 'IDM'],
  'braindance': ['IDM', 'Braindance'],
  'intelligent dance music': ['IDM', 'IDM'],
  'glitch': ['IDM', 'Glitch'],
  'trip hop': ['Trip Hop', 'Trip Hop'],
  'downtempo': ['Trip Hop', 'Downtempo'],
  'bristol sound': ['Trip Hop', 'Bristol Sound'],
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
  'indie dance': ['Alternative Dance', 'Indie Dance'],
  'alternative dance': ['Alternative Dance', 'Alternative Dance'],
  'indie pop': ['Indie Pop', 'Indie Pop'],
  'chamber pop': ['Indie Pop', 'Chamber Pop'],
  'bedroom pop': ['Indie Pop', 'Bedroom Pop'],

  // Rock & Metal
  'post-punk': ['Post-Punk Revival', 'Post-Punk'],
  'post-punk revival': ['Post-Punk Revival', 'Post-Punk Revival'],
  'garage rock': ['Rock', 'Garage Rock'],
  'garage rock revival': ['Post-Punk Revival', 'Garage Rock Revival'],
  'goth rock': ['Post-Punk Revival', 'Goth Rock'],
  'indie rock': ['Indie Rock', 'Indie Rock'],
  'oxford indie': ['Indie Rock', 'Oxford Indie'],
  'sheffield indie': ['Indie Rock', 'Sheffield Indie'],
  'grunge': ['Alternative Rock', 'Grunge'],
  'britpop': ['Alternative Rock', 'Britpop'],
  'shoegaze': ['Alternative Rock', 'Shoegaze'],
  'dream pop': ['Alternative Rock', 'Dream Pop'],
  'art rock': ['Alternative Rock', 'Art Rock'],
  'permanent wave': ['Alternative Rock', 'Permanent Wave'],
  'modern rock': ['Alternative Rock', 'Modern Rock'],
  'heavy metal': ['Metal', 'Heavy Metal'],
  'death metal': ['Metal', 'Death Metal'],
  'black metal': ['Metal', 'Black Metal'],
  'thrash metal': ['Metal', 'Thrash Metal'],
  'metalcore': ['Metal', 'Metalcore'],
  'nu metal': ['Metal', 'Nu Metal'],
  'doom metal': ['Metal', 'Doom Metal'],

  // Country, Folk, Classical, Jazz, Blues, Reggae, Latin
  'bluegrass': ['Country', 'Bluegrass'],
  'americana': ['Country', 'Americana'],
  'outlaw country': ['Country', 'Outlaw Country'],
  'alt-country': ['Country', 'Alt-Country'],
  'classic country': ['Country', 'Classic Country'],
  'acoustic folk': ['Folk', 'Acoustic Folk'],
  'singer-songwriter': ['Folk', 'Singer-Songwriter'],
  'bebop': ['Jazz', 'Bebop'],
  'hard bop': ['Jazz', 'Hard Bop'],
  'modal jazz': ['Jazz', 'Modal Jazz'],
  'cool jazz': ['Jazz', 'Cool Jazz'],
  'jazz fusion': ['Jazz', 'Fusion'],
  'baroque': ['Classical', 'Baroque'],
  'symphony': ['Classical', 'Symphony'],
  'romantic': ['Classical', 'Romantic Classical'],
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
  'krautrock': ['Electronic', 'Krautrock'],
};
