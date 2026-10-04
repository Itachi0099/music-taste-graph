/**
 * SymphonyGraph Performance & Latency Audit
 *
 * Measures:
 * 1. Cold classification
 * 2. Cached classification
 * 3. ArtistKnowledgeRegistry lookup
 * 4. Microgenre ontology lookup
 * 5. Full classification path over 10,000 iterations
 *
 * Run via: npx tsx scripts/perfCheck.ts
 */

import { findArtistKnowledge } from '../src/utils/genreKnowledge/artistKnowledge.js';
import { EVERY_NOISE_MICROGENRE_MAP } from '../src/utils/genreKnowledge/ontologyData.js';
import { evaluateGenreEvidence } from '../src/utils/genreKnowledge/evidenceEngine.js';
import { classifyCanonicalGenre } from '../src/utils/genreClassifier.js';

function benchmarkPerformance() {
  console.log('========================================================================================');
  console.log('SYMPHONYGRAPH KNOWLEDGE ENGINE - PERFORMANCE & LATENCY AUDIT');
  console.log('========================================================================================\n');

  const WARMUP_ROUNDS = 500;
  const BENCH_ROUNDS = 10000;

  // 1. ArtistKnowledgeRegistry Lookup
  for (let i = 0; i < WARMUP_ROUNDS; i++) findArtistKnowledge('Damru');
  const t0 = performance.now();
  for (let i = 0; i < BENCH_ROUNDS; i++) {
    findArtistKnowledge('Damru');
    findArtistKnowledge('Guinea Pigs');
    findArtistKnowledge('Unlisted Artist');
  }
  const registryDurationMs = performance.now() - t0;
  const registryPerLookupUs = (registryDurationMs / (BENCH_ROUNDS * 3)) * 1000;

  // 2. Microgenre Ontology Lookup
  for (let i = 0; i < WARMUP_ROUNDS; i++) {
    const _ = EVERY_NOISE_MICROGENRE_MAP['darkpsy'];
  }
  const t1 = performance.now();
  for (let i = 0; i < BENCH_ROUNDS; i++) {
    const _a = EVERY_NOISE_MICROGENRE_MAP['darkpsy'];
    const _b = EVERY_NOISE_MICROGENRE_MAP['contemporary r&b'];
    const _c = EVERY_NOISE_MICROGENRE_MAP['minimal techno'];
  }
  const ontologyDurationMs = performance.now() - t1;
  const ontologyPerLookupUs = (ontologyDurationMs / (BENCH_ROUNDS * 3)) * 1000;

  // 3. Cold Classification (first time uncached)
  const coldStart = performance.now();
  classifyCanonicalGenre(['psytrance', 'goa trance'], 'Astrix');
  const coldDurationUs = (performance.now() - coldStart) * 1000;

  // 4. Full Classification Pipeline
  for (let i = 0; i < WARMUP_ROUNDS; i++) {
    evaluateGenreEvidence({ artistName: 'SZA', spotifyGenres: ['pop', 'contemporary r&b'] });
  }
  const t2 = performance.now();
  for (let i = 0; i < BENCH_ROUNDS; i++) {
    evaluateGenreEvidence({ artistName: 'SZA', spotifyGenres: ['pop', 'contemporary r&b'] });
    evaluateGenreEvidence({ artistName: 'Bicep', spotifyGenres: ['breakbeat', 'uk bass'] });
    evaluateGenreEvidence({ artistName: 'Unknown', spotifyGenres: [] });
  }
  const fullDurationMs = performance.now() - t2;
  const fullPerClassificationUs = (fullDurationMs / (BENCH_ROUNDS * 3)) * 1000;

  console.log(`1. ArtistKnowledgeRegistry Lookup:   ${registryPerLookupUs.toFixed(3)} µs / lookup`);
  console.log(`2. Microgenre Ontology Lookup:        ${ontologyPerLookupUs.toFixed(3)} µs / lookup`);
  console.log(`3. Cold Classification Latency:       ${coldDurationUs.toFixed(3)} µs`);
  console.log(`4. Full Multi-Signal Classification:  ${fullPerClassificationUs.toFixed(3)} µs / track (${(fullPerClassificationUs / 1000).toFixed(4)} ms)`);
  console.log(`\nThroughput: ~${Math.round(1000000 / fullPerClassificationUs).toLocaleString()} classifications / second`);
  console.log('========================================================================================\n');
}

benchmarkPerformance();
