/**
 * SymphonyGraph Offline Genre Audit & Evaluation Tool
 *
 * Runs an offline comparative evaluation between the Old Classifier
 * and the new Genre Knowledge Engine across real-world fixtures.
 *
 * Run via: npm run genre:audit
 */

import { classifyCanonicalGenre } from '../src/utils/genreClassifier';
import { evaluateGenreEvidence, type EvidenceQueryInput } from '../src/utils/genreKnowledge/evidenceEngine';

interface AuditFixture {
  artistName: string;
  trackTitle?: string;
  spotifyGenres: string[];
  fallbackGenres?: string[];
  fallbackArtistName?: string;
  expectedCanonical: string;
  expectedSubgenre?: string;
  notes: string;
}

const AUDIT_FIXTURES: AuditFixture[] = [
  // 1. Critical Real-World Failure Cases
  {
    artistName: 'Damru',
    trackTitle: 'Yaatra',
    spotifyGenres: [],
    fallbackGenres: ['Trance'],
    fallbackArtistName: 'Damru',
    expectedCanonical: 'Psytrance',
    expectedSubgenre: 'Ragatrance',
    notes: 'Real-world failure: was appearing as Christian on naive provider search; origin of Ragatrance',
  },
  {
    artistName: 'Guinea Pigs',
    trackTitle: 'Zonk',
    spotifyGenres: [],
    fallbackGenres: ['Country'], // iTunes entity #191215671 collision
    fallbackArtistName: 'Guinea Pigs',
    expectedCanonical: 'Psytrance',
    expectedSubgenre: 'Dark Psytrance',
    notes: 'Real-world failure: Apple Music/iTunes catalog collision with country artist',
  },

  // 2. Psytrance & Trance Artists
  {
    artistName: 'Astrix',
    trackTitle: 'Deep Jungle Walk',
    spotifyGenres: ['psytrance', 'goa trance'],
    expectedCanonical: 'Psytrance',
    expectedSubgenre: 'Goa Trance',
    notes: 'Psytrance legend, goa trance subgenre',
  },
  {
    artistName: 'Kindzadza',
    trackTitle: 'Spirit of the Wind',
    spotifyGenres: ['darkpsy', 'hi-tech'],
    expectedCanonical: 'Psytrance',
    expectedSubgenre: 'Darkpsy',
    notes: 'Pioneer of high-speed darkpsy/hitech',
  },
  {
    artistName: 'Infected Mushroom',
    trackTitle: 'Becoming Insane',
    spotifyGenres: ['psychedelic trance', 'trance'],
    expectedCanonical: 'Psytrance',
    expectedSubgenre: 'Psychedelic Trance',
    notes: 'Psytrance beats Trance on specificity',
  },

  // 3. R&B Artists (Preventing Pop Collapse)
  {
    artistName: 'SZA',
    trackTitle: 'Kill Bill',
    spotifyGenres: ['pop', 'contemporary r&b'],
    expectedCanonical: 'R&B',
    expectedSubgenre: 'Contemporary R&B',
    notes: 'Spotify lists pop first; R&B must win',
  },
  {
    artistName: 'Frank Ocean',
    trackTitle: 'Pink + White',
    spotifyGenres: ['neo soul', 'r&b', 'pop'],
    expectedCanonical: 'R&B',
    expectedSubgenre: 'Neo Soul',
    notes: 'Neo soul must map to R&B',
  },
  {
    artistName: 'The Weeknd',
    trackTitle: 'Blinding Lights',
    spotifyGenres: ['alternative r&b', 'pop'],
    expectedCanonical: 'R&B',
    expectedSubgenre: 'Alternative R&B',
    notes: 'Alternative R&B must map to R&B',
  },
  {
    artistName: 'Erykah Badu',
    trackTitle: 'On & On',
    spotifyGenres: ['neo soul', 'soul'],
    expectedCanonical: 'R&B',
    expectedSubgenre: 'Neo Soul',
    notes: 'Classic neo soul',
  },
  {
    artistName: "D'Angelo",
    trackTitle: 'Brown Sugar',
    spotifyGenres: ['r&b', 'classic soul'],
    expectedCanonical: 'R&B',
    expectedSubgenre: 'Soul',
    notes: 'Classic soul / R&B',
  },

  // 4. Hip Hop & Rap
  {
    artistName: 'Kendrick Lamar',
    trackTitle: 'HUMBLE.',
    spotifyGenres: ['conscious hip hop', 'hip hop', 'rap'],
    expectedCanonical: 'Hip Hop',
    expectedSubgenre: 'Hip Hop',
    notes: 'Conscious hip hop to Hip Hop',
  },
  {
    artistName: 'Travis Scott',
    trackTitle: 'SICKO MODE',
    spotifyGenres: ['trap', 'hip hop', 'rap'],
    expectedCanonical: 'Hip Hop',
    expectedSubgenre: 'Trap',
    notes: 'Trap to Hip Hop',
  },
  {
    artistName: 'Gucci Mane',
    trackTitle: 'Wake Up in the Sky',
    spotifyGenres: ['trap'],
    expectedCanonical: 'Hip Hop',
    expectedSubgenre: 'Trap',
    notes: 'Pure trap tag',
  },

  // 5. Electronic & House & Breakbeat
  {
    artistName: 'Daft Punk',
    trackTitle: 'One More Time',
    spotifyGenres: ['french house', 'electro'],
    expectedCanonical: 'French House',
    expectedSubgenre: 'French House',
    notes: 'French House beats electro',
  },
  {
    artistName: 'Bicep',
    trackTitle: 'Glue',
    spotifyGenres: ['breakbeat', 'uk bass'],
    expectedCanonical: 'Breakbeat',
    expectedSubgenre: 'UK Bass',
    notes: 'Breakbeat/UK Bass',
  },
  {
    artistName: 'Jeff Mills',
    trackTitle: 'The Bells',
    spotifyGenres: ['techno', 'minimal techno'],
    expectedCanonical: 'Techno',
    expectedSubgenre: 'Minimal Techno',
    notes: 'Detroit techno pioneer',
  },
  {
    artistName: 'Frankie Knuckles',
    trackTitle: 'Your Love',
    spotifyGenres: ['chicago house', 'house'],
    expectedCanonical: 'House',
    expectedSubgenre: 'House',
    notes: 'Godfather of house music',
  },
  {
    artistName: 'Eric Prydz',
    trackTitle: 'Opus',
    spotifyGenres: ['progressive house', 'house'],
    expectedCanonical: 'Progressive House',
    expectedSubgenre: 'Progressive House',
    notes: 'Progressive house beats house',
  },
  {
    artistName: 'Kraftwerk',
    trackTitle: 'Autobahn',
    spotifyGenres: ['electronic', 'krautrock'],
    expectedCanonical: 'Electronic',
    expectedSubgenre: 'Electronic',
    notes: 'Pure electronic umbrella',
  },

  // 6. Rock, Metal, Indie, Country, Jazz
  {
    artistName: 'Radiohead',
    trackTitle: 'Paranoid Android',
    spotifyGenres: ['alternative rock', 'art rock'],
    expectedCanonical: 'Alternative Rock',
    expectedSubgenre: 'Alternative Rock',
    notes: 'Alternative rock pioneer',
  },
  {
    artistName: 'Arctic Monkeys',
    trackTitle: 'Do I Wanna Know?',
    spotifyGenres: ['indie rock', 'garage rock'],
    expectedCanonical: 'Indie Rock',
    expectedSubgenre: 'Indie Rock',
    notes: 'Sheffield indie rock',
  },
  {
    artistName: 'The Strokes',
    trackTitle: 'Last Nite',
    spotifyGenres: ['post-punk revival', 'garage rock'],
    expectedCanonical: 'Post-Punk Revival',
    expectedSubgenre: 'Post-Punk',
    notes: 'Post-punk revival pioneer',
  },
  {
    artistName: 'Metallica',
    trackTitle: 'Enter Sandman',
    spotifyGenres: ['heavy metal', 'hard rock'],
    expectedCanonical: 'Metal',
    expectedSubgenre: 'Metal',
    notes: 'Metal beats hard rock',
  },
  {
    artistName: 'Johnny Cash',
    trackTitle: 'Ring of Fire',
    spotifyGenres: ['outlaw country', 'classic country'],
    expectedCanonical: 'Country',
    expectedSubgenre: 'Country',
    notes: 'Outlaw country',
  },
  {
    artistName: 'Miles Davis',
    trackTitle: 'So What',
    spotifyGenres: ['modal jazz', 'jazz'],
    expectedCanonical: 'Jazz',
    expectedSubgenre: 'Modal Jazz',
    notes: 'Modal jazz pioneer',
  },
  {
    artistName: 'Bob Marley',
    trackTitle: 'Three Little Birds',
    spotifyGenres: ['roots reggae', 'reggae'],
    expectedCanonical: 'Reggae',
    expectedSubgenre: 'Roots Reggae',
    notes: 'Roots reggae',
  },
  {
    artistName: 'Frédéric Chopin',
    trackTitle: 'Nocturne in E-Flat Major',
    spotifyGenres: ['classical', 'romantic'],
    expectedCanonical: 'Classical',
    expectedSubgenre: 'Classical',
    notes: 'Classical romantic piano',
  },

  // 7. Unknown / Unlisted Artists (Honest Uncertainty)
  {
    artistName: 'Mystery Basement Producer',
    trackTitle: 'Track 01',
    spotifyGenres: [],
    fallbackGenres: [],
    expectedCanonical: 'Unknown',
    expectedSubgenre: 'Unknown',
    notes: 'Zero evidence must honestly return Unknown, never Pop/Country/Electronic',
  },
];

console.log('========================================================================================');
console.log('SYMPHONYGRAPH GENRE KNOWLEDGE ENGINE - OFFLINE COMPARATIVE AUDIT');
console.log('========================================================================================\n');

let passCount = 0;
let improvedCount = 0;
let preservedCount = 0;
let regressionCount = 0;

for (const fix of AUDIT_FIXTURES) {
  // Old classifier output
  const oldResult = classifyCanonicalGenre(fix.spotifyGenres, fix.artistName, fix.trackTitle);

  // New Knowledge Engine output
  const input: EvidenceQueryInput = {
    artistName: fix.artistName,
    trackTitle: fix.trackTitle,
    spotifyGenres: fix.spotifyGenres,
    fallbackGenres: fix.fallbackGenres,
    fallbackArtistName: fix.fallbackArtistName,
  };
  const newResult = evaluateGenreEvidence(input);

  const newCorrect =
    newResult.canonicalGenre === fix.expectedCanonical &&
    (!fix.expectedSubgenre || newResult.subgenre === fix.expectedSubgenre);

  if (newCorrect) passCount++;

  let status = 'PRESERVED';
  if (oldResult.canonicalGenre !== fix.expectedCanonical && newResult.canonicalGenre === fix.expectedCanonical) {
    status = '★ IMPROVED';
    improvedCount++;
  } else if (newResult.canonicalGenre === fix.expectedCanonical) {
    preservedCount++;
  } else {
    status = '✖ REGRESSION';
    regressionCount++;
  }

  console.log(`Artist: ${fix.artistName.padEnd(26)} | Status: ${status}`);
  console.log(`  Raw Evidence:      [${fix.spotifyGenres.join(', ')}] ${fix.fallbackGenres?.length ? `| Fallback: [${fix.fallbackGenres.join(', ')}]` : ''}`);
  console.log(`  Old Classifier:    ${oldResult.canonicalGenre} / ${oldResult.subgenre}`);
  console.log(`  Knowledge Engine:  ${newResult.canonicalGenre} / ${newResult.subgenre} (Confidence: ${newResult.confidence}, Score: ${newResult.confidenceScore})`);
  console.log(`  Expected:          ${fix.expectedCanonical}${fix.expectedSubgenre ? ` / ${fix.expectedSubgenre}` : ''}`);
  console.log(`  Reason:            ${newResult.selectionReason}`);
  if (newResult.conflictDetected) {
    console.log(`  Conflict:          ${newResult.conflictResolution}`);
  }
  console.log('----------------------------------------------------------------------------------------');
}

console.log('\n========================================================================================');
console.log(`AUDIT SUMMARY: ${passCount} / ${AUDIT_FIXTURES.length} fixtures passed (${((passCount / AUDIT_FIXTURES.length) * 100).toFixed(1)}%)`);
console.log(`  ★ Improved:   ${improvedCount}`);
console.log(`  ✓ Preserved:  ${preservedCount}`);
console.log(`  ✖ Regression: ${regressionCount}`);
console.log('========================================================================================');
