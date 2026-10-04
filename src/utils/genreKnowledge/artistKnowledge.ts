/**
 * SymphonyGraph Structured Artist Knowledge Registry
 *
 * Provides a typed, data-driven registry of verified artist identities,
 * musicological associations, and upstream catalog collision defenses.
 * Eliminates all ad-hoc conditional branching in the classification engine.
 *
 * DATA PROVENANCE:
 * - Verified musicological taxonomies, discographies, and community catalogs (MusicBrainz, Discogs).
 * - Documented streaming catalog homonym conflations (e.g., Apple Music / iTunes artist ID collisions).
 */

export type ArtistKnowledgeProvenance =
  | 'musicbrainz'
  | 'verified_catalog'
  | 'curated_musicological'
  | 'community_consensus';

export interface ArtistKnowledgeEntry {
  normalizedName: string;
  displayName: string;
  primaryCanonical: string;
  primarySubgenre: string;
  verifiedGenres: string[];
  confidence: 'HIGH' | 'MEDIUM';
  confidenceScore: number;
  provenance: ArtistKnowledgeProvenance;
  disambiguationNotes: string;
  collisionTarget?: string; // e.g. 'Country' or 'itunes:191215671'
  providerIds?: {
    spotify?: string;
    musicbrainz?: string;
    itunes?: string;
  };
}

/**
 * Normalizes artist names for invariant dictionary lookup.
 * Strips punctuation, diacritics, leading/trailing whitespace, and collapses multiple spaces.
 */
export function normalizeArtistKey(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics (e.g. Frédéric -> Frederic)
    .replace(/[^\w\s]/g, ' ') // replace punctuation with spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Authoritative registry of known musicological artist identities.
 * Indexed by normalized key for O(1) access.
 */
export const ARTIST_KNOWLEDGE_REGISTRY: Record<string, ArtistKnowledgeEntry> = {
  // 1. Critical Historical Collision & Identity Anchors
  'damru': {
    normalizedName: 'damru',
    displayName: 'Damru',
    primaryCanonical: 'Psytrance',
    primarySubgenre: 'Ragatrance',
    verifiedGenres: ['ragatrance', 'psytrance', 'psychedelic trance', 'goa trance'],
    confidence: 'HIGH',
    confidenceScore: 1.0,
    provenance: 'curated_musicological',
    disambiguationNotes:
      'Established originator of Ragatrance (fusion of Hindustani Classical raga scales and Psychedelic Trance). Distinct from devotional/spiritual song homonyms (e.g. Siddharth Mohan).',
    collisionTarget: 'Christian & Gospel',
  },
  'guinea pigs': {
    normalizedName: 'guinea pigs',
    displayName: 'Guinea Pigs',
    primaryCanonical: 'Psytrance',
    primarySubgenre: 'Dark Psytrance',
    verifiedGenres: ['darkpsy', 'psytrance', 'dark psychedelic trance'],
    confidence: 'HIGH',
    confidenceScore: 1.0,
    provenance: 'verified_catalog',
    disambiguationNotes:
      'Israeli psychedelic trance project (Avi & Shalom Sagges). Apple Music/iTunes entity #191215671 conflates with obscure 2005 country group.',
    collisionTarget: 'Country',
    providerIds: {
      itunes: '191215671',
    },
  },

  // 2. Psytrance Family Anchors
  'astrix': {
    normalizedName: 'astrix',
    displayName: 'Astrix',
    primaryCanonical: 'Psytrance',
    primarySubgenre: 'Goa Trance',
    verifiedGenres: ['psytrance', 'goa trance', 'full-on psy'],
    confidence: 'HIGH',
    confidenceScore: 1.0,
    provenance: 'curated_musicological',
    disambiguationNotes: 'Global psychedelic trance and goa trance pioneer.',
  },
  'kindzadza': {
    normalizedName: 'kindzadza',
    displayName: 'Kindzadza',
    primaryCanonical: 'Psytrance',
    primarySubgenre: 'Hi-Tech',
    verifiedGenres: ['hi-tech', 'darkpsy', 'psycore'],
    confidence: 'HIGH',
    confidenceScore: 1.0,
    provenance: 'curated_musicological',
    disambiguationNotes: 'Pioneer of high-speed darkpsy, psycore, and hi-tech trance.',
  },
  'kashyyyk': {
    normalizedName: 'kashyyyk',
    displayName: 'Kashyyyk',
    primaryCanonical: 'Psytrance',
    primarySubgenre: 'Darkpsy',
    verifiedGenres: ['darkpsy', 'psycore', 'hi-tech'],
    confidence: 'HIGH',
    confidenceScore: 1.0,
    provenance: 'curated_musicological',
    disambiguationNotes: 'Mexican darkpsy and high-BPM psycore producer.',
  },
  'infected mushroom': {
    normalizedName: 'infected mushroom',
    displayName: 'Infected Mushroom',
    primaryCanonical: 'Psytrance',
    primarySubgenre: 'Psychedelic Trance',
    verifiedGenres: ['psytrance', 'psychedelic trance'],
    confidence: 'HIGH',
    confidenceScore: 1.0,
    provenance: 'musicbrainz',
    disambiguationNotes: 'Pioneering Israeli psychedelic trance duo.',
  },

  // 3. R&B & Neo Soul Anchors (Preventing Pop Collapse)
  'sza': {
    normalizedName: 'sza',
    displayName: 'SZA',
    primaryCanonical: 'R&B',
    primarySubgenre: 'Contemporary R&B',
    verifiedGenres: ['contemporary r&b', 'alternative r&b', 'neo soul'],
    confidence: 'HIGH',
    confidenceScore: 1.0,
    provenance: 'musicbrainz',
    disambiguationNotes: 'Leading contemporary and alternative R&B artist.',
  },
  'frank ocean': {
    normalizedName: 'frank ocean',
    displayName: 'Frank Ocean',
    primaryCanonical: 'R&B',
    primarySubgenre: 'Neo Soul',
    verifiedGenres: ['neo soul', 'contemporary r&b', 'alternative r&b'],
    confidence: 'HIGH',
    confidenceScore: 1.0,
    provenance: 'musicbrainz',
    disambiguationNotes: 'Critically acclaimed neo soul and alternative R&B innovator.',
  },
  'the weeknd': {
    normalizedName: 'the weeknd',
    displayName: 'The Weeknd',
    primaryCanonical: 'R&B',
    primarySubgenre: 'Alternative R&B',
    verifiedGenres: ['alternative r&b', 'contemporary r&b', 'canadian contemporary r&b'],
    confidence: 'HIGH',
    confidenceScore: 1.0,
    provenance: 'musicbrainz',
    disambiguationNotes: 'Originator of dark alternative R&B aesthetic.',
  },
  'erykah badu': {
    normalizedName: 'erykah badu',
    displayName: 'Erykah Badu',
    primaryCanonical: 'R&B',
    primarySubgenre: 'Neo Soul',
    verifiedGenres: ['neo soul', 'soul', 'r&b'],
    confidence: 'HIGH',
    confidenceScore: 1.0,
    provenance: 'musicbrainz',
    disambiguationNotes: 'First lady of neo soul.',
  },
  'd angelo': {
    normalizedName: 'd angelo',
    displayName: "D'Angelo",
    primaryCanonical: 'R&B',
    primarySubgenre: 'Neo Soul',
    verifiedGenres: ['neo soul', 'classic soul', 'r&b'],
    confidence: 'HIGH',
    confidenceScore: 1.0,
    provenance: 'musicbrainz',
    disambiguationNotes: 'Seminal neo soul and classic funk/soul musician.',
  },

  // 4. Electronic, Bass & Techno Anchors
  'bicep': {
    normalizedName: 'bicep',
    displayName: 'Bicep',
    primaryCanonical: 'Breakbeat',
    primarySubgenre: 'UK Bass',
    verifiedGenres: ['breakbeat', 'uk bass', 'ambient breaks'],
    confidence: 'HIGH',
    confidenceScore: 1.0,
    provenance: 'verified_catalog',
    disambiguationNotes: 'Belfast electronic duo known for breakbeat, UK bass, and atmospheric house.',
  },
  'jeff mills': {
    normalizedName: 'jeff mills',
    displayName: 'Jeff Mills',
    primaryCanonical: 'Techno',
    primarySubgenre: 'Minimal Techno',
    verifiedGenres: ['techno', 'minimal techno', 'detroit techno'],
    confidence: 'HIGH',
    confidenceScore: 1.0,
    provenance: 'curated_musicological',
    disambiguationNotes: 'The Wizard; foundational pioneer of Detroit techno and minimal techno.',
  },
  'kraftwerk': {
    normalizedName: 'kraftwerk',
    displayName: 'Kraftwerk',
    primaryCanonical: 'Electronic',
    primarySubgenre: 'Electronic',
    verifiedGenres: ['electronic', 'krautrock', 'electro'],
    confidence: 'HIGH',
    confidenceScore: 1.0,
    provenance: 'musicbrainz',
    disambiguationNotes: 'Foundational electronic music innovators.',
  },
  'daft punk': {
    normalizedName: 'daft punk',
    displayName: 'Daft Punk',
    primaryCanonical: 'French House',
    primarySubgenre: 'French House',
    verifiedGenres: ['french house', 'french touch', 'filter house', 'electro'],
    confidence: 'HIGH',
    confidenceScore: 1.0,
    provenance: 'musicbrainz',
    disambiguationNotes: 'Pioneering Parisian French Touch and filter house duo.',
  },
  'eric prydz': {
    normalizedName: 'eric prydz',
    displayName: 'Eric Prydz',
    primaryCanonical: 'Progressive House',
    primarySubgenre: 'Progressive House',
    verifiedGenres: ['progressive house', 'melodic house', 'tech house'],
    confidence: 'HIGH',
    confidenceScore: 1.0,
    provenance: 'verified_catalog',
    disambiguationNotes: 'Swedish progressive house and melodic techno producer.',
  },
  'aphex twin': {
    normalizedName: 'aphex twin',
    displayName: 'Aphex Twin',
    primaryCanonical: 'IDM',
    primarySubgenre: 'Braindance',
    verifiedGenres: ['idm', 'braindance', 'ambient techno', 'drill and bass'],
    confidence: 'HIGH',
    confidenceScore: 1.0,
    provenance: 'musicbrainz',
    disambiguationNotes: 'Iconic pioneer of intelligent dance music (IDM) and braindance.',
  },

  // 5. Roots, Traditional & Historical Anchors
  'johnny cash': {
    normalizedName: 'johnny cash',
    displayName: 'Johnny Cash',
    primaryCanonical: 'Country',
    primarySubgenre: 'Outlaw Country',
    verifiedGenres: ['outlaw country', 'classic country', 'americana'],
    confidence: 'HIGH',
    confidenceScore: 1.0,
    provenance: 'musicbrainz',
    disambiguationNotes: 'Legendary outlaw country and Americana icon.',
  },
  'miles davis': {
    normalizedName: 'miles davis',
    displayName: 'Miles Davis',
    primaryCanonical: 'Jazz',
    primarySubgenre: 'Modal Jazz',
    verifiedGenres: ['modal jazz', 'bebop', 'cool jazz', 'fusion'],
    confidence: 'HIGH',
    confidenceScore: 1.0,
    provenance: 'musicbrainz',
    disambiguationNotes: 'Pivotal figure in jazz history, modal jazz, and jazz fusion.',
  },
  'bob marley': {
    normalizedName: 'bob marley',
    displayName: 'Bob Marley',
    primaryCanonical: 'Reggae',
    primarySubgenre: 'Roots Reggae',
    verifiedGenres: ['roots reggae', 'reggae', 'ska'],
    confidence: 'HIGH',
    confidenceScore: 1.0,
    provenance: 'musicbrainz',
    disambiguationNotes: 'Global ambassador of roots reggae music and Rastafari culture.',
  },
  'frederic chopin': {
    normalizedName: 'frederic chopin',
    displayName: 'Frédéric Chopin',
    primaryCanonical: 'Classical',
    primarySubgenre: 'Classical',
    verifiedGenres: ['classical', 'romantic', 'piano classical'],
    confidence: 'HIGH',
    confidenceScore: 1.0,
    provenance: 'musicbrainz',
    disambiguationNotes: 'Polish composer of the Romantic period.',
  },
};

/**
 * Searches the structured Artist Knowledge Registry for a verified artist entry.
 * Checks normalized name variations.
 */
export function findArtistKnowledge(artistName?: string | null): ArtistKnowledgeEntry | undefined {
  if (!artistName) return undefined;
  const key = normalizeArtistKey(artistName);
  if (!key) return undefined;

  // Direct match
  if (ARTIST_KNOWLEDGE_REGISTRY[key]) {
    return ARTIST_KNOWLEDGE_REGISTRY[key];
  }

  // Exact lowercase fallback
  const rawKey = artistName.trim().toLowerCase();
  if (ARTIST_KNOWLEDGE_REGISTRY[rawKey]) {
    return ARTIST_KNOWLEDGE_REGISTRY[rawKey];
  }

  return undefined;
}
