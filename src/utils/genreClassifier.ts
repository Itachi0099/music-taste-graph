/**
 * SymphonyGraph Canonical Genre Taxonomy & Classification Engine
 *
 * Implements deterministic canonical genre normalization, multi-genre precedence,
 * specificity scoring, and catalog collision mitigation.
 */

import {
  resolveGenreWithKnowledge,
  type GenreConfidenceLevel,
  type GenreEvidenceItem,
} from './genreKnowledge';

export interface GenreClassificationResult {
  canonicalGenre: string;
  subgenre: string;
  confidence: number;
  source: 'spotify' | 'fallback_song' | 'fallback_artist' | 'curated' | 'unknown' | string;
  candidates: string[];
  selectionReason: string;
  confidenceLevel?: GenreConfidenceLevel;
  evidence?: GenreEvidenceItem[];
  conflictDetected?: boolean;
  conflictResolution?: string;
}

/**
 * Isolated, documented registry of verified streaming catalog collisions.
 * Used only when upstream streaming providers (e.g. Apple Music / Spotify) have
 * merged multiple distinct artists with identical names under a single catalog ID.
 */
export const CURATED_ARTIST_OVERRIDES: Record<string, { canonicalGenre: string; subgenre: string; reason: string }> = {
  'guinea pigs': {
    canonicalGenre: 'Psytrance',
    subgenre: 'Dark Psytrance',
    reason: 'Israeli psychedelic trance project (Avi & Shalom Sagges); iTunes artist entity #191215671 has catalog homonym conflation with obscure country artist',
  },
};

/**
 * Canonical Genre definitions and matching rules.
 * Higher specificity weight ensures specific subgenres take precedence over broad umbrellas
 * (e.g., Contemporary R&B beats generic Pop; Psytrance beats generic Electronic).
 */
export interface CanonicalRule {
  canonical: string;
  weight: number; // Higher number = more specific
  patterns: RegExp[];
  subgenreDeriver?: (raw: string) => string;
}

export const CANONICAL_RULES: CanonicalRule[] = [
  // 1. Psytrance (High specificity)
  {
    canonical: 'Psytrance',
    weight: 95,
    patterns: [
      /\bhi-?tech\b/i,
      /\bhitech\b/i,
      /\bpsycore\b/i,
      /\bdark\s?psy\b/i,
      /\bdarkpsy\b/i,
      /\bpsytrance\b/i,
      /\bpsychedelic\s+trance\b/i,
      /\bgoa\s+trance\b/i,
      /\bgoa\b/i,
      /\bfull-?on\s+psy\b/i,
      /\bforest\s+psy\b/i,
      /\bzenonesque\b/i,
      /\bsuomisaundi\b/i,
      /\bpsy-?trance\b/i,
    ],
    subgenreDeriver: (raw: string) => {
      if (/hi-?tech/i.test(raw)) return 'Hi-Tech';
      if (/psycore/i.test(raw)) return 'Psycore';
      if (/dark\s?psy/i.test(raw)) return 'Darkpsy';
      if (/goa/i.test(raw)) return 'Goa Trance';
      if (/forest/i.test(raw)) return 'Forest Psy';
      return 'Psychedelic Trance';
    },
  },

  // 2. Trance
  {
    canonical: 'Trance',
    weight: 80,
    patterns: [
      /\bprogressive\s+trance\b/i,
      /\buplifting\s+trance\b/i,
      /\bvocal\s+trance\b/i,
      /\btech\s+trance\b/i,
      /\bacid\s+trance\b/i,
      /\bhard\s+trance\b/i,
      /\beuro\s+trance\b/i,
      /\bclassic\s+trance\b/i,
      /\btrance\b/i,
    ],
    subgenreDeriver: (raw: string) => {
      if (/progressive\s+trance/i.test(raw)) return 'Progressive Trance';
      if (/uplifting/i.test(raw)) return 'Uplifting Trance';
      if (/vocal/i.test(raw)) return 'Vocal Trance';
      return 'Trance';
    },
  },

  // 3. R&B / Soul (High specificity to prevent being swallowed by generic Pop)
  {
    canonical: 'R&B',
    weight: 90,
    patterns: [
      /\bcontemporary\s+r&b\b/i,
      /\balternative\s+r&b\b/i,
      /\br&b\b/i,
      /\brnb\b/i,
      /\brhythm\s+and\s+blues\b/i,
      /\bneo\s+soul\b/i,
      /\burban\s+contemporary\b/i,
      /\bquiet\s+storm\b/i,
      /\btrap\s+soul\b/i,
      /\br&b\/soul\b/i,
      /\bindie\s+r&b\b/i,
      /\bchill\s+r&b\b/i,
      /\bclassic\s+soul\b/i,
      /\bmotown\b/i,
      /\bsoul\b/i,
    ],
    subgenreDeriver: (raw: string) => {
      if (/alternative\s+r&b/i.test(raw)) return 'Alternative R&B';
      if (/contemporary\s+r&b/i.test(raw)) return 'Contemporary R&B';
      if (/neo\s+soul/i.test(raw)) return 'Neo Soul';
      if (/trap\s+soul/i.test(raw)) return 'Trap Soul';
      if (/soul/i.test(raw)) return 'Soul';
      return 'Contemporary R&B';
    },
  },

  // 4. Techno
  {
    canonical: 'Techno',
    weight: 85,
    patterns: [
      /\bacid\s+techno\b/i,
      /\bindustrial\s+techno\b/i,
      /\bschranz\b/i,
      /\bpeak\s+time\s+techno\b/i,
      /\bminimal\s+techno\b/i,
      /\bdub\s+techno\b/i,
      /\bhard\s+techno\b/i,
      /\bberlin\s+sound\b/i,
      /\btechno\b/i,
    ],
    subgenreDeriver: (raw: string) => {
      if (/acid/i.test(raw)) return 'Acid Techno';
      if (/industrial/i.test(raw)) return 'Industrial Techno';
      if (/schranz/i.test(raw)) return 'Schranz';
      if (/minimal/i.test(raw)) return 'Minimal Techno';
      return 'Techno';
    },
  },

  // 5. French House / Nu Disco / Progressive House / House
  {
    canonical: 'French House',
    weight: 88,
    patterns: [/\bfrench\s+house\b/i, /\bfrench\s+touch\b/i, /\bfilter\s+house\b/i, /\bdisco\s+house\b/i],
    subgenreDeriver: () => 'French House',
  },
  {
    canonical: 'Nu Disco',
    weight: 87,
    patterns: [/\bnu\s+disco\b/i, /\bspace\s+disco\b/i, /\bcosmic\s+disco\b/i, /\bitalo\s+disco\b/i],
    subgenreDeriver: () => 'Nu Disco',
  },
  {
    canonical: 'Progressive House',
    weight: 86,
    patterns: [/\bprogressive\s+house\b/i, /\bmelodic\s+house\b/i],
    subgenreDeriver: () => 'Progressive House',
  },
  {
    canonical: 'House',
    weight: 80,
    patterns: [
      /\bdeep\s+house\b/i,
      /\btech\s+house\b/i,
      /\belectro\s+house\b/i,
      /\bchicago\s+house\b/i,
      /\bacid\s+house\b/i,
      /\bclub\s+house\b/i,
      /\bhouse\b/i,
    ],
    subgenreDeriver: (raw: string) => {
      if (/deep\s+house/i.test(raw)) return 'Deep House';
      if (/tech\s+house/i.test(raw)) return 'Tech House';
      return 'House';
    },
  },

  // 6. Hip Hop / Rap
  {
    canonical: 'Hip Hop',
    weight: 85,
    patterns: [
      /\bhip\s*hop\b/i,
      /\brap\b/i,
      /\btrap\b/i,
      /\bdrill\b/i,
      /\bboom\s+bap\b/i,
      /\beast\s+coast\b/i,
      /\bwest\s+coast\b/i,
      /\bgangsta\s+rap\b/i,
      /\bconscious\s+hip\s+hop\b/i,
    ],
    subgenreDeriver: (raw: string) => {
      if (/trap/i.test(raw)) return 'Trap';
      if (/drill/i.test(raw)) return 'Drill';
      if (/boom\s+bap/i.test(raw)) return 'Boom Bap';
      return 'Hip Hop';
    },
  },

  // 7. Breakbeat / UK Bass / Drum and Bass
  {
    canonical: 'Breakbeat',
    weight: 85,
    patterns: [
      /\bbreakbeat\b/i,
      /\bbreaks\b/i,
      /\buk\s+bass\b/i,
      /\bdrum\s+and\s+bass\b/i,
      /\bdnb\b/i,
      /\bjungle\b/i,
      /\bdubstep\b/i,
      /\buk\s+garage\b/i,
      /\b2-step\b/i,
    ],
    subgenreDeriver: (raw: string) => {
      if (/drum\s+and\s+bass|dnb/i.test(raw)) return 'Drum & Bass';
      if (/jungle/i.test(raw)) return 'Jungle';
      if (/dubstep/i.test(raw)) return 'Dubstep';
      if (/uk\s+bass/i.test(raw)) return 'UK Bass';
      return 'Breakbeat';
    },
  },

  // 8. IDM / Trip Hop / Ambient
  {
    canonical: 'IDM',
    weight: 85,
    patterns: [/\bidm\b/i, /\bbraindance\b/i, /\bintelligent\s+dance\s+music\b/i, /\bglitch\b/i],
    subgenreDeriver: () => 'IDM',
  },
  {
    canonical: 'Trip Hop',
    weight: 85,
    patterns: [/\btrip\s+hop\b/i, /\bbristol\s+sound\b/i, /\bdowntempo\b/i],
    subgenreDeriver: () => 'Trip Hop',
  },
  {
    canonical: 'Ambient',
    weight: 80,
    patterns: [/\bambient\b/i, /\bdrone\b/i, /\bambient\s+techno\b/i, /\bmodern\s+classical\b/i],
    subgenreDeriver: () => 'Ambient',
  },

  // 9. Synth-pop / Alternative Dance
  {
    canonical: 'Synth-pop',
    weight: 82,
    patterns: [/\bsynth-?pop\b/i, /\bsynthwave\b/i, /\bnew\s+wave\b/i, /\bdark\s+wave\b/i, /\belectropop\b/i],
    subgenreDeriver: () => 'Synth-pop',
  },
  {
    canonical: 'Alternative Dance',
    weight: 81,
    patterns: [/\balternative\s+dance\b/i, /\bindie\s+dance\b/i, /\bdance-punk\b/i, /\belectroclash\b/i],
    subgenreDeriver: () => 'Alternative Dance',
  },

  // 10. Rock / Post-Punk / Indie Rock / Alternative Rock
  {
    canonical: 'Post-Punk Revival',
    weight: 85,
    patterns: [/\bpost-punk\b/i, /\bpost-punk\s+revival\b/i, /\bgarage\s+rock\s+revival\b/i, /\bgoth\s+rock\b/i],
    subgenreDeriver: () => 'Post-Punk',
  },
  {
    canonical: 'Indie Rock',
    weight: 80,
    patterns: [/\bindie\s+rock\b/i, /\bgoxford\s+indie\b/i, /\bsheffield\s+indie\b/i, /\bindie\b/i],
    subgenreDeriver: () => 'Indie Rock',
  },
  {
    canonical: 'Alternative Rock',
    weight: 78,
    patterns: [/\balternative\s+rock\b/i, /\bgrunge\b/i, /\bbritpop\b/i, /\bart\s+rock\b/i, /\bpermanent\s+wave\b/i, /\bmodern\s+rock\b/i],
    subgenreDeriver: () => 'Alternative Rock',
  },
  {
    canonical: 'Rock',
    weight: 65,
    patterns: [/\bhard\s+rock\b/i, /\bclassic\s+rock\b/i, /\bpsychedelic\s+rock\b/i, /\bgarage\s+rock\b/i, /\brock\b/i],
    subgenreDeriver: () => 'Rock',
  },

  // 11. Metal
  {
    canonical: 'Metal',
    weight: 85,
    patterns: [/\bmetal\b/i, /\bheavy\s+metal\b/i, /\bdeath\s+metal\b/i, /\bblack\s+metal\b/i, /\bthrash\s+metal\b/i, /\bmetalcore\b/i, /\bnu\s+metal\b/i],
    subgenreDeriver: () => 'Metal',
  },

  // 12. Jazz
  {
    canonical: 'Jazz',
    weight: 85,
    patterns: [/\bjazz\b/i, /\bbebop\b/i, /\bhard\s+bop\b/i, /\bmodal\s+jazz\b/i, /\bcool\s+jazz\b/i, /\bfusion\b/i],
    subgenreDeriver: () => 'Jazz',
  },

  // 13. Pop / Indie Pop (Lower weight so specific R&B/Rock isn't misclassified as generic Pop)
  {
    canonical: 'Indie Pop',
    weight: 75,
    patterns: [/\bindie\s+pop\b/i, /\bchamber\s+pop\b/i, /\bbedroom\s+pop\b/i],
    subgenreDeriver: () => 'Indie Pop',
  },
  {
    canonical: 'Pop',
    weight: 45,
    patterns: [/\bdance\s+pop\b/i, /\bpop\b/i, /\bart\s+pop\b/i, /\bmetropopolis\b/i, /\bteen\s+pop\b/i],
    subgenreDeriver: () => 'Pop',
  },

  // 14. Electronic (General umbrella, moderate weight)
  {
    canonical: 'Electronic',
    weight: 50,
    patterns: [/\belectronic\b/i, /\belectronica\b/i, /\bedm\b/i, /\belectro\b/i, /\bclub\b/i, /\bdance\b/i],
    subgenreDeriver: () => 'Electronic',
  },

  // 15. Classical
  {
    canonical: 'Classical',
    weight: 85,
    patterns: [/\bclassical\b/i, /\bbaroque\b/i, /\bchamber\b/i, /\bsymphony\b/i, /\borchestral\b/i],
    subgenreDeriver: () => 'Classical',
  },

  // 16. Country (Strict patterns - NEVER a default)
  {
    canonical: 'Country',
    weight: 80,
    patterns: [
      /\bcountry\b/i,
      /\bbluegrass\b/i,
      /\bamericana\b/i,
      /\boutlaw\s+country\b/i,
      /\balt-country\b/i,
      /\bnashville\s+sound\b/i,
    ],
    subgenreDeriver: () => 'Country',
  },

  // 17. Folk
  {
    canonical: 'Folk',
    weight: 75,
    patterns: [/\bfolk\b/i, /\bacoustic\s+folk\b/i, /\bsinger-songwriter\b/i],
    subgenreDeriver: () => 'Folk',
  },

  // 18. Reggae
  {
    canonical: 'Reggae',
    weight: 85,
    patterns: [/\breggae\b/i, /\bdub\b/i, /\bdancehall\b/i, /\broots\s+reggae\b/i, /\bska\b/i],
    subgenreDeriver: () => 'Reggae',
  },

  // 19. Latin
  {
    canonical: 'Latin',
    weight: 80,
    patterns: [/\blatin\b/i, /\breggaeton\b/i, /\bsalsa\b/i, /\bbachata\b/i, /\bcumbia\b/i],
    subgenreDeriver: () => 'Latin',
  },

  // 20. Blues
  {
    canonical: 'Blues',
    weight: 80,
    patterns: [/\bblues\b/i, /\bdelta\s+blues\b/i, /\belectric\s+blues\b/i],
    subgenreDeriver: () => 'Blues',
  },
];

/**
 * Classifies a set of raw genre strings into a single canonical genre and subgenre.
 * Implements deterministic specificity ranking, Every Noise ontology knowledge,
 * and explainable conflict resolution.
 */
export function classifyCanonicalGenre(
  sourceGenres: string[] | string | undefined | null,
  artistName?: string,
  trackTitle?: string
): GenreClassificationResult {
  const result = resolveGenreWithKnowledge({
    artistName: artistName || '',
    trackTitle,
    spotifyGenres: sourceGenres,
  });

  return {
    canonicalGenre: result.canonicalGenre,
    subgenre: result.subgenre,
    confidence: result.confidenceScore,
    source: (result.source === 'curated' ? 'curated' : result.source === 'unknown' ? 'unknown' : 'spotify') as any,
    candidates: result.candidates,
    selectionReason: result.selectionReason,
    confidenceLevel: result.confidence,
    evidence: result.evidence,
    conflictDetected: result.conflictDetected,
    conflictResolution: result.conflictResolution,
  };
}

/**
 * Cleanly capitalizes arbitrary genre strings (e.g. "french house" -> "French House")
 */
export function cleanGenreString(str: string): string {
  if (!str) return 'Unknown';
  return str
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Safe, credential-free diagnostic logger for artist genre auditing (Requirement 2).
 */
export function diagnoseArtistGenre(
  artistName: string,
  rawSourceGenres: string[],
  fallbackGenres: string[],
  classification: GenreClassificationResult,
  cacheHit = false
): void {
  console.log(`[GenreAudit] ----------------------------------------`);
  console.log(`[GenreAudit] Artist: ${artistName}`);
  console.log(`[GenreAudit] Raw source genres: [${rawSourceGenres.join(', ')}]`);
  console.log(`[GenreAudit] Fallback genres: [${fallbackGenres.join(', ')}]`);
  console.log(`[GenreAudit] Canonical candidates: [${classification.candidates.join(', ')}]`);
  console.log(`[GenreAudit] Selected primary genre: ${classification.canonicalGenre}`);
  console.log(`[GenreAudit] Selected subgenre: ${classification.subgenre}`);
  console.log(`[GenreAudit] Selection reason: ${classification.selectionReason}`);
  console.log(`[GenreAudit] Source: ${classification.source}`);
  console.log(`[GenreAudit] Cache hit: ${cacheHit ? 'yes' : 'no'}`);
  console.log(`[GenreAudit] ----------------------------------------`);
}
