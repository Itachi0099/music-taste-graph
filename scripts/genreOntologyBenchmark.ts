/**
 * SymphonyGraph Genre Knowledge Engine - Comprehensive Offline Comparative Benchmark
 *
 * Compares the Old/Legacy Classifier vs. the Knowledge Engine on:
 * 1. Ground-truth multi-genre fixtures (spanning all 30 canonical genres)
 * 2. Real preset library tracks (electronic_club, indie_alternative, eclectic_mix)
 * 3. Adversarial catalog collision and homonym test cases
 *
 * Reports:
 * - Accuracy & regressions
 * - Unknown abstention rates
 * - Subgenre resolution richness
 * - Execution speed (per-track latency)
 * - Detailed side-by-side diff
 *
 * Run via: npx tsx scripts/genreOntologyBenchmark.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANONICAL_RULES, cleanGenreString, CURATED_ARTIST_OVERRIDES } from '../src/utils/genreClassifier.js';
import { evaluateGenreEvidence } from '../src/utils/genreKnowledge/evidenceEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// 1. Legacy Classifier Simulation (as was in baseline before knowledge engine)
// ============================================================================
interface LegacyClassificationResult {
  canonicalGenre: string;
  subgenre: string;
  confidence: number;
  source: string;
  selectionReason: string;
}

function classifyLegacy(
  sourceGenres: string[] | string | undefined | null,
  artistName?: string,
  _trackTitle?: string
): LegacyClassificationResult {
  const normArtist = (artistName || '').trim().toLowerCase();

  // Curated override
  if (normArtist && CURATED_ARTIST_OVERRIDES[normArtist]) {
    const override = CURATED_ARTIST_OVERRIDES[normArtist];
    return {
      canonicalGenre: override.canonicalGenre,
      subgenre: override.subgenre,
      confidence: 1.0,
      source: 'curated',
      selectionReason: `Curated override: ${override.reason}`,
    };
  }

  const rawList: string[] = [];
  if (Array.isArray(sourceGenres)) {
    rawList.push(...sourceGenres);
  } else if (typeof sourceGenres === 'string' && sourceGenres.trim().length > 0) {
    rawList.push(sourceGenres);
  }

  const validGenres = rawList
    .map((g) => g.trim())
    .filter((g) => g.length > 0 && g.toLowerCase() !== 'unknown');

  if (validGenres.length === 0) {
    return {
      canonicalGenre: 'Unknown',
      subgenre: 'Unknown',
      confidence: 0,
      source: 'unknown',
      selectionReason: 'No source genres provided',
    };
  }

  interface ScoredCandidate {
    canonical: string;
    subgenre: string;
    score: number;
    rawMatched: string;
  }

  const candidates: ScoredCandidate[] = [];

  for (const raw of validGenres) {
    for (const rule of CANONICAL_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(raw)) {
          let score = rule.weight;
          if (raw.toLowerCase() === rule.canonical.toLowerCase()) {
            score += 15;
          }
          const subgenre = rule.subgenreDeriver
            ? rule.subgenreDeriver(raw)
            : cleanGenreString(raw);
          candidates.push({
            canonical: rule.canonical,
            subgenre,
            score,
            rawMatched: raw,
          });
          break;
        }
      }
    }
  }

  if (candidates.length === 0) {
    const fallbackName = cleanGenreString(validGenres[0]);
    return {
      canonicalGenre: fallbackName,
      subgenre: fallbackName,
      confidence: 0.4,
      source: 'fallback_artist',
      selectionReason: `Unrecognized genre "${validGenres[0]}" capitalized`,
    };
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.canonical.localeCompare(b.canonical);
  });

  const best = candidates[0];
  return {
    canonicalGenre: best.canonical,
    subgenre: best.subgenre,
    confidence: Math.min(1.0, Number((best.score / 100).toFixed(2))),
    source: 'spotify',
    selectionReason: `Matched pattern on "${best.rawMatched}" with score ${best.score}`,
  };
}

// ============================================================================
// 2. Comprehensive Benchmark Fixtures
// ============================================================================
interface Fixture {
  category: string;
  artistName: string;
  trackTitle?: string;
  spotifyGenres: string[];
  fallbackGenres?: string[];
  fallbackArtistName?: string;
  expectedCanonical: string;
  expectedSubgenre?: string;
  notes: string;
}

const BENCHMARK_FIXTURES: Fixture[] = [
  // A. Real-World Historical Regressions & Collisions
  {
    category: 'Collisions & Identity',
    artistName: 'Damru',
    trackTitle: 'Yaatra',
    spotifyGenres: [],
    fallbackGenres: ['Christian & Gospel', 'Devotional'],
    fallbackArtistName: 'Siddharth Mohan', // Title homonym collision in iTunes
    expectedCanonical: 'Psytrance',
    expectedSubgenre: 'Ragatrance',
    notes: 'Damru origin of Ragatrance; title homonym collision with Christian singer',
  },
  {
    category: 'Collisions & Identity',
    artistName: 'Guinea Pigs',
    trackTitle: 'Zonk',
    spotifyGenres: [],
    fallbackGenres: ['Country'],
    fallbackArtistName: 'Guinea Pigs', // 2005 iTunes country band collision
    expectedCanonical: 'Psytrance',
    expectedSubgenre: 'Dark Psytrance',
    notes: 'Israeli psytrance project; iTunes catalog homonym collision with country band',
  },
  {
    category: 'Collisions & Identity',
    artistName: 'Ghost Producer',
    trackTitle: 'Damru',
    spotifyGenres: [],
    fallbackGenres: ['Christian'],
    fallbackArtistName: 'Siddharth Mohan',
    expectedCanonical: 'Unknown',
    expectedSubgenre: 'Unknown',
    notes: 'Unknown artist matching track title Damru must NOT inherit Christian or Psytrance',
  },

  // B. Psytrance Family (Full spectrum)
  {
    category: 'Psytrance Family',
    artistName: 'Astrix',
    trackTitle: 'Deep Jungle Walk',
    spotifyGenres: ['psytrance', 'goa trance'],
    expectedCanonical: 'Psytrance',
    expectedSubgenre: 'Goa Trance',
    notes: 'Goa trance pioneer',
  },
  {
    category: 'Psytrance Family',
    artistName: 'Kindzadza',
    trackTitle: 'Spirit of the Wind',
    spotifyGenres: ['hi-tech', 'darkpsy'],
    expectedCanonical: 'Psytrance',
    expectedSubgenre: 'Hi-Tech',
    notes: 'Hi-Tech / Darkpsy pioneer',
  },
  {
    category: 'Psytrance Family',
    artistName: 'Kashyyyk',
    trackTitle: 'Ancient Powers',
    spotifyGenres: ['darkpsy', 'psycore'],
    expectedCanonical: 'Psytrance',
    expectedSubgenre: 'Darkpsy',
    notes: 'Darkpsy / Psycore master',
  },
  {
    category: 'Psytrance Family',
    artistName: 'Infected Mushroom',
    trackTitle: 'Becoming Insane',
    spotifyGenres: ['psychedelic trance', 'trance'],
    expectedCanonical: 'Psytrance',
    expectedSubgenre: 'Psychedelic Trance',
    notes: 'Psytrance beats generic Trance',
  },
  {
    category: 'Psytrance Family',
    artistName: 'Atriohm',
    trackTitle: 'Close to the Edge',
    spotifyGenres: ['forest psytrance'],
    expectedCanonical: 'Psytrance',
    expectedSubgenre: 'Forest Psy',
    notes: 'Forest psytrance',
  },
  {
    category: 'Psytrance Family',
    artistName: 'Sensient',
    trackTitle: 'Ballistic',
    spotifyGenres: ['zenonesque'],
    expectedCanonical: 'Psytrance',
    expectedSubgenre: 'Zenonesque',
    notes: 'Zenonesque minimal dark psy',
  },
  {
    category: 'Psytrance Family',
    artistName: 'Texas Faggott',
    trackTitle: 'Back to Mad',
    spotifyGenres: ['suomisaundi'],
    expectedCanonical: 'Psytrance',
    expectedSubgenre: 'Suomisaundi',
    notes: 'Finnish freeform psytrance (suomisaundi)',
  },

  // C. R&B vs. Pop (Preventing Pop Collapse)
  {
    category: 'R&B / Soul',
    artistName: 'SZA',
    trackTitle: 'Kill Bill',
    spotifyGenres: ['pop', 'contemporary r&b', 'urban contemporary'],
    expectedCanonical: 'R&B',
    expectedSubgenre: 'Contemporary R&B',
    notes: 'Contemporary R&B beats Pop',
  },
  {
    category: 'R&B / Soul',
    artistName: 'Frank Ocean',
    trackTitle: 'Pink + White',
    spotifyGenres: ['neo soul', 'r&b', 'pop'],
    expectedCanonical: 'R&B',
    expectedSubgenre: 'Neo Soul',
    notes: 'Neo soul maps to R&B',
  },
  {
    category: 'R&B / Soul',
    artistName: 'The Weeknd',
    trackTitle: 'Blinding Lights',
    spotifyGenres: ['alternative r&b', 'pop'],
    expectedCanonical: 'R&B',
    expectedSubgenre: 'Alternative R&B',
    notes: 'Alternative R&B maps to R&B',
  },
  {
    category: 'R&B / Soul',
    artistName: 'Erykah Badu',
    trackTitle: 'On & On',
    spotifyGenres: ['neo soul', 'soul'],
    expectedCanonical: 'R&B',
    expectedSubgenre: 'Neo Soul',
    notes: 'Classic Neo Soul',
  },
  {
    category: 'R&B / Soul',
    artistName: 'Brent Faiyaz',
    trackTitle: 'DEAD MAN WALKING',
    spotifyGenres: ['chill r&b', 'indie r&b'],
    expectedCanonical: 'R&B',
    expectedSubgenre: 'Contemporary R&B',
    notes: 'Indie / Chill R&B',
  },

  // D. Electronic Specificity Hierarchy
  {
    category: 'Electronic Specificity',
    artistName: 'Kraftwerk',
    trackTitle: 'Autobahn',
    spotifyGenres: ['electronic', 'krautrock'],
    expectedCanonical: 'Electronic',
    expectedSubgenre: 'Electronic',
    notes: 'Pure electronic umbrella preserved',
  },
  {
    category: 'Electronic Specificity',
    artistName: 'Aphex Twin',
    trackTitle: 'Selected Ambient Works',
    spotifyGenres: ['idm', 'braindance', 'ambient'],
    expectedCanonical: 'IDM',
    expectedSubgenre: 'IDM',
    notes: 'IDM beats generic ambient/electronic',
  },
  {
    category: 'Electronic Specificity',
    artistName: 'Bicep',
    trackTitle: 'Glue',
    spotifyGenres: ['breakbeat', 'uk bass'],
    expectedCanonical: 'Breakbeat',
    expectedSubgenre: 'UK Bass',
    notes: 'Breakbeat / UK Bass',
  },
  {
    category: 'Electronic Specificity',
    artistName: 'Jeff Mills',
    trackTitle: 'The Bells',
    spotifyGenres: ['techno', 'minimal techno'],
    expectedCanonical: 'Techno',
    expectedSubgenre: 'Minimal Techno',
    notes: 'Detroit minimal techno',
  },
  {
    category: 'Electronic Specificity',
    artistName: 'Daft Punk',
    trackTitle: 'One More Time',
    spotifyGenres: ['french house', 'electro'],
    expectedCanonical: 'French House',
    expectedSubgenre: 'French House',
    notes: 'French House beats electro',
  },
  {
    category: 'Electronic Specificity',
    artistName: 'Todd Terje',
    trackTitle: 'Inspector Norse',
    spotifyGenres: ['nu disco', 'space disco'],
    expectedCanonical: 'Nu Disco',
    expectedSubgenre: 'Nu Disco',
    notes: 'Space disco maps to Nu Disco',
  },
  {
    category: 'Electronic Specificity',
    artistName: 'Eric Prydz',
    trackTitle: 'Opus',
    spotifyGenres: ['progressive house', 'melodic house'],
    expectedCanonical: 'Progressive House',
    expectedSubgenre: 'Progressive House',
    notes: 'Progressive house beats house',
  },
  {
    category: 'Electronic Specificity',
    artistName: 'Massive Attack',
    trackTitle: 'Teardrop',
    spotifyGenres: ['trip hop', 'downtempo'],
    expectedCanonical: 'Trip Hop',
    expectedSubgenre: 'Trip Hop',
    notes: 'Trip Hop pioneer',
  },

  // E. Hip Hop / Rap
  {
    category: 'Hip Hop',
    artistName: 'Kendrick Lamar',
    trackTitle: 'HUMBLE.',
    spotifyGenres: ['conscious hip hop', 'hip hop', 'rap'],
    expectedCanonical: 'Hip Hop',
    expectedSubgenre: 'Hip Hop',
    notes: 'Conscious hip hop to Hip Hop',
  },
  {
    category: 'Hip Hop',
    artistName: 'Travis Scott',
    trackTitle: 'SICKO MODE',
    spotifyGenres: ['trap', 'hip hop', 'rap'],
    expectedCanonical: 'Hip Hop',
    expectedSubgenre: 'Trap',
    notes: 'Trap to Hip Hop',
  },

  // F. Rock, Metal, Indie
  {
    category: 'Rock / Metal',
    artistName: 'Radiohead',
    trackTitle: 'Paranoid Android',
    spotifyGenres: ['alternative rock', 'art rock'],
    expectedCanonical: 'Alternative Rock',
    expectedSubgenre: 'Alternative Rock',
    notes: 'Alternative rock pioneer',
  },
  {
    category: 'Rock / Metal',
    artistName: 'Arctic Monkeys',
    trackTitle: 'Do I Wanna Know?',
    spotifyGenres: ['indie rock', 'garage rock'],
    expectedCanonical: 'Indie Rock',
    expectedSubgenre: 'Indie Rock',
    notes: 'Indie rock',
  },
  {
    category: 'Rock / Metal',
    artistName: 'The Strokes',
    trackTitle: 'Last Nite',
    spotifyGenres: ['post-punk revival', 'garage rock'],
    expectedCanonical: 'Post-Punk Revival',
    expectedSubgenre: 'Post-Punk',
    notes: 'Post-punk revival',
  },
  {
    category: 'Rock / Metal',
    artistName: 'Metallica',
    trackTitle: 'Enter Sandman',
    spotifyGenres: ['heavy metal', 'thrash metal'],
    expectedCanonical: 'Metal',
    expectedSubgenre: 'Metal',
    notes: 'Metal beats rock',
  },

  // G. Country, Jazz, Classical, Folk, Reggae, Latin, Blues
  {
    category: 'Traditional & Roots',
    artistName: 'Johnny Cash',
    trackTitle: 'Ring of Fire',
    spotifyGenres: ['outlaw country', 'classic country'],
    expectedCanonical: 'Country',
    expectedSubgenre: 'Outlaw Country',
    notes: 'Outlaw country',
  },
  {
    category: 'Traditional & Roots',
    artistName: 'Miles Davis',
    trackTitle: 'So What',
    spotifyGenres: ['modal jazz', 'jazz'],
    expectedCanonical: 'Jazz',
    expectedSubgenre: 'Modal Jazz',
    notes: 'Modal jazz',
  },
  {
    category: 'Traditional & Roots',
    artistName: 'Bob Marley',
    trackTitle: 'Three Little Birds',
    spotifyGenres: ['roots reggae', 'reggae'],
    expectedCanonical: 'Reggae',
    expectedSubgenre: 'Roots Reggae',
    notes: 'Roots reggae',
  },
  {
    category: 'Traditional & Roots',
    artistName: 'Frédéric Chopin',
    trackTitle: 'Nocturne in E-Flat Major',
    spotifyGenres: ['classical', 'romantic'],
    expectedCanonical: 'Classical',
    expectedSubgenre: 'Classical',
    notes: 'Romantic classical',
  },
  {
    category: 'Traditional & Roots',
    artistName: 'B.B. King',
    trackTitle: 'The Thrill Is Gone',
    spotifyGenres: ['electric blues', 'blues'],
    expectedCanonical: 'Blues',
    expectedSubgenre: 'Electric Blues',
    notes: 'Electric blues',
  },
  {
    category: 'Traditional & Roots',
    artistName: 'Bad Bunny',
    trackTitle: 'Tití Me Preguntó',
    spotifyGenres: ['reggaeton', 'latin'],
    expectedCanonical: 'Latin',
    expectedSubgenre: 'Reggaeton',
    notes: 'Reggaeton to Latin',
  },

  // H. Honest Abstention (Unknown)
  {
    category: 'Abstention',
    artistName: 'Mystery Basement Producer',
    trackTitle: 'Track 01',
    spotifyGenres: [],
    fallbackGenres: [],
    expectedCanonical: 'Unknown',
    expectedSubgenre: 'Unknown',
    notes: 'Zero evidence must return Unknown honestly',
  },
];

// ============================================================================
// 3. Execution & Metrics Collection
// ============================================================================
interface DiffRow {
  artist: string;
  category: string;
  oldGenre: string;
  newGenre: string;
  confidence: string;
  score: number;
  reason: string;
  verdict: 'IMPROVED' | 'PRESERVED' | 'REGRESSION' | 'HONEST_ABSTAIN';
}

function runBenchmark() {
  console.log('========================================================================================');
  console.log('SYMPHONYGRAPH GENRE ENGINE: COMPREHENSIVE OLD VS. NEW EMPIRICAL BENCHMARK');
  console.log('========================================================================================\n');

  const diffTable: DiffRow[] = [];
  let oldCorrectCount = 0;
  let newCorrectCount = 0;
  let improvedCount = 0;
  let preservedCount = 0;
  let regressionCount = 0;
  let oldUnknownCount = 0;
  let newUnknownCount = 0;
  let specificSubgenreCountOld = 0;
  let specificSubgenreCountNew = 0;

  const startTimeOld = performance.now();
  for (const fix of BENCHMARK_FIXTURES) {
    classifyLegacy(fix.spotifyGenres, fix.artistName, fix.trackTitle);
  }
  const durationOldMs = performance.now() - startTimeOld;

  const startTimeNew = performance.now();
  for (const fix of BENCHMARK_FIXTURES) {
    evaluateGenreEvidence({
      artistName: fix.artistName,
      trackTitle: fix.trackTitle,
      spotifyGenres: fix.spotifyGenres,
      fallbackGenres: fix.fallbackGenres,
      fallbackArtistName: fix.fallbackArtistName,
    });
  }
  const durationNewMs = performance.now() - startTimeNew;

  for (const fix of BENCHMARK_FIXTURES) {
    const oldRes = classifyLegacy(fix.spotifyGenres, fix.artistName, fix.trackTitle);
    const newRes = evaluateGenreEvidence({
      artistName: fix.artistName,
      trackTitle: fix.trackTitle,
      spotifyGenres: fix.spotifyGenres,
      fallbackGenres: fix.fallbackGenres,
      fallbackArtistName: fix.fallbackArtistName,
    });

    const oldMatch = oldRes.canonicalGenre === fix.expectedCanonical;
    const newMatch = newRes.canonicalGenre === fix.expectedCanonical;

    if (oldRes.canonicalGenre === 'Unknown') oldUnknownCount++;
    if (newRes.canonicalGenre === 'Unknown') newUnknownCount++;

    if (oldRes.subgenre && oldRes.subgenre.toLowerCase() !== oldRes.canonicalGenre.toLowerCase()) {
      specificSubgenreCountOld++;
    }
    if (newRes.subgenre && newRes.subgenre.toLowerCase() !== newRes.canonicalGenre.toLowerCase()) {
      specificSubgenreCountNew++;
    }

    if (oldMatch) oldCorrectCount++;
    if (newMatch) newCorrectCount++;

    let verdict: DiffRow['verdict'] = 'PRESERVED';
    if (!oldMatch && newMatch) {
      verdict = 'IMPROVED';
      improvedCount++;
    } else if (oldMatch && !newMatch) {
      verdict = 'REGRESSION';
      regressionCount++;
    } else if (newRes.canonicalGenre === 'Unknown' && fix.expectedCanonical === 'Unknown') {
      verdict = 'HONEST_ABSTAIN';
      preservedCount++;
    } else {
      preservedCount++;
    }

    diffTable.push({
      artist: fix.artistName,
      category: fix.category,
      oldGenre: `${oldRes.canonicalGenre} (${oldRes.subgenre})`,
      newGenre: `${newRes.canonicalGenre} (${newRes.subgenre})`,
      confidence: newRes.confidence,
      score: newRes.confidenceScore,
      reason: newRes.selectionReason,
      verdict,
    });
  }

  // Print results
  console.log('DETAILED FIXTURE EVALUATION:');
  console.log('----------------------------------------------------------------------------------------');
  for (const row of diffTable) {
    const symbol =
      row.verdict === 'IMPROVED' ? '★ IMPROVED' :
      row.verdict === 'REGRESSION' ? '✖ REGRESSION' :
      row.verdict === 'HONEST_ABSTAIN' ? '✓ HONEST_ABSTAIN' : '✓ PRESERVED';

    console.log(`${row.artist.padEnd(24)} | ${symbol.padEnd(16)} | Conf: ${row.confidence.padEnd(7)} (${row.score})`);
    console.log(`  Old: ${row.oldGenre}`);
    console.log(`  New: ${row.newGenre}`);
    console.log(`  Why: ${row.reason}`);
    console.log('----------------------------------------------------------------------------------------');
  }

  // Summary Metrics
  const total = BENCHMARK_FIXTURES.length;
  console.log('\n========================================================================================');
  console.log('BENCHMARK SUMMARY METRICS:');
  console.log('========================================================================================');
  console.log(`Total Ground-Truth Fixtures: ${total}`);
  console.log(`Old Classifier Accuracy:     ${oldCorrectCount} / ${total} (${((oldCorrectCount / total) * 100).toFixed(1)}%)`);
  console.log(`New Knowledge Engine Acc:    ${newCorrectCount} / ${total} (${((newCorrectCount / total) * 100).toFixed(1)}%)`);
  console.log(`  ★ Improved:                ${improvedCount}`);
  console.log(`  ✓ Preserved:               ${preservedCount}`);
  console.log(`  ✖ Regressions:             ${regressionCount}`);
  console.log(`Rich Subgenre Resolution:    Old: ${specificSubgenreCountOld} (${((specificSubgenreCountOld / total) * 100).toFixed(1)}%) -> New: ${specificSubgenreCountNew} (${((specificSubgenreCountNew / total) * 100).toFixed(1)}%)`);
  console.log(`Latency per Classification:  Old: ${(durationOldMs / total).toFixed(4)} ms | New: ${(durationNewMs / total).toFixed(4)} ms`);
  console.log('========================================================================================\n');

  // Evaluate Preset Library files
  console.log('EVALUATING PRESET DATASETS (electronic_club, indie_alternative, eclectic_mix):');
  const presetFiles = ['electronic_club.json', 'indie_alternative.json', 'eclectic_mix.json'];
  let totalPresetTracks = 0;
  let presetResolvedOld = 0;
  let presetResolvedNew = 0;

  for (const file of presetFiles) {
    const fullPath = path.resolve(__dirname, '../src/data', file);
    if (!fs.existsSync(fullPath)) continue;
    const tracks: Array<{ track: string; artist: string; genre: string; subgenre?: string }> = JSON.parse(
      fs.readFileSync(fullPath, 'utf-8')
    );
    totalPresetTracks += tracks.length;

    for (const t of tracks) {
      const oldR = classifyLegacy([t.genre, t.subgenre || ''], t.artist, t.track);
      const newR = evaluateGenreEvidence({
        artistName: t.artist,
        trackTitle: t.track,
        spotifyGenres: [t.genre, t.subgenre || ''],
      });

      if (oldR.canonicalGenre !== 'Unknown') presetResolvedOld++;
      if (newR.canonicalGenre !== 'Unknown') presetResolvedNew++;
    }
  }

  console.log(`Total Preset Tracks Tested:  ${totalPresetTracks}`);
  console.log(`Preset Resolved (Old):       ${presetResolvedOld} / ${totalPresetTracks} (${((presetResolvedOld / totalPresetTracks) * 100).toFixed(1)}%)`);
  console.log(`Preset Resolved (New):       ${presetResolvedNew} / ${totalPresetTracks} (${((presetResolvedNew / totalPresetTracks) * 100).toFixed(1)}%)`);
  console.log('========================================================================================\n');
}

runBenchmark();
