/**
 * SymphonyGraph Genre Knowledge Engine - Adversarial Integrity & Information Paradox Test Suite
 *
 * Validates:
 * 1. Incident A (Guinea Pigs): Catalog collision defense against Country
 * 2. Incident B (Damru): Track-title homonym defense against devotional track collision
 * 3. Incident C (Noor / Aarzu): Mononym disambiguation prevents French Pop catalog hijack
 * 4. Strict 30 Canonical Genre Bounding: Arbitrary strings never become canonical systems
 * 5. Information Paradox Invariant: Contradictory information lowers confidence
 * 6. Multi-Source Convergence: Independent source agreement boosts confidence
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateGenreEvidence,
  verifyExternalArtistIdentity,
  VALID_CANONICAL_GENRES,
  isCanonicalGenre,
} from '../src/utils/genreKnowledge/index.js';

describe('Adversarial & Genre Information Paradox Suite', () => {
  // ==========================================================================
  // 1. INCIDENT C: Noor / Aarzu Mononym Catalog Disambiguation
  // ==========================================================================
  test('Incident C: Uncorroborated external artist search for mononym "Noor" with track "Aarzu" is rejected', () => {
    // Attempt 1: iTunes song search returns track "Meri Aarzu Pe Shabaab Hai" by "Noor Jehan"
    const attempt1 = verifyExternalArtistIdentity(
      'Noor',
      'Noor Jehan',
      'Aarzu',
      'Meri Aarzu Pe Shabaab Hai',
      'Worldwide'
    );
    assert.equal(attempt1.isVerified, false);
    assert.equal(attempt1.grade, 'AMBIGUOUS');

    // Attempt 2: iTunes artist search returns artist "Noor" (French Pop singer), with no track correlation
    const attempt2 = verifyExternalArtistIdentity(
      'Noor',
      'Noor',
      'Aarzu',
      undefined,
      'French Pop'
    );
    assert.equal(attempt2.isVerified, false);
    assert.equal(attempt2.grade, 'AMBIGUOUS');
    assert.match(attempt2.reason, /mononym/i);

    // End-to-end evaluation: unverified external fallback does NOT pollute canonical genre
    const resolution = evaluateGenreEvidence({
      artistName: 'Noor',
      trackTitle: 'Aarzu',
      fallbackGenres: ['French Pop'],
      fallbackArtistName: 'Noor',
    });

    // Noor must NOT resolve to "French Pop" or create a "French Pop" stellar system!
    assert.notEqual(resolution.canonicalGenre, 'French Pop');
    assert.equal(resolution.canonicalGenre, 'Unknown');
    assert.equal(resolution.confidence, 'UNKNOWN');
    assert.equal(resolution.confidenceScore, 0);
  });

  test('Incident C: Corroborated track for mononym DOES verify correctly', () => {
    const verified = verifyExternalArtistIdentity(
      'Noor',
      'Noor',
      'Aarzu',
      'Aarzu',
      'Pop'
    );
    assert.equal(verified.isVerified, true);
    assert.equal(verified.grade, 'EXACT');
  });

  // ==========================================================================
  // 2. INCIDENT A: Guinea Pigs Catalog Collision Defense
  // ==========================================================================
  test('Incident A: Guinea Pigs rejects external Country collision and resolves to Psytrance', () => {
    const collisionVerification = verifyExternalArtistIdentity(
      'Guinea Pigs',
      'Guinea Pigs',
      undefined,
      undefined,
      'Country'
    );
    assert.equal(collisionVerification.isVerified, false);
    assert.equal(collisionVerification.grade, 'MISMATCH');
    assert.match(collisionVerification.reason, /catalog collision/i);

    // End-to-end evaluation: resolves authoritatively to Psytrance from verified registry
    const result = evaluateGenreEvidence({
      artistName: 'Guinea Pigs',
      fallbackGenres: ['Country'],
      fallbackArtistName: 'Guinea Pigs',
    });
    assert.equal(result.canonicalGenre, 'Psytrance');
    assert.equal(result.subgenre, 'Dark Psytrance');
    assert.equal(result.confidence, 'HIGH');
  });

  // ==========================================================================
  // 3. INCIDENT B: Damru Track-Title Homonym Defense
  // ==========================================================================
  test('Incident B: Damru rejects devotional track-title homonym and resolves to Psytrance / Ragatrance', () => {
    const homonymVerification = verifyExternalArtistIdentity(
      'Damru',
      'Siddharth Mohan',
      'Damru',
      'Damru',
      'Devotional'
    );
    assert.equal(homonymVerification.isVerified, false);
    assert.equal(homonymVerification.grade, 'MISMATCH');
    assert.match(homonymVerification.reason, /track-title homonym/i);

    // End-to-end evaluation: resolves authoritatively to Psytrance from verified registry
    const result = evaluateGenreEvidence({
      artistName: 'Damru',
      trackTitle: 'Damru',
      fallbackGenres: ['Devotional'],
      fallbackArtistName: 'Siddharth Mohan',
    });
    assert.equal(result.canonicalGenre, 'Psytrance');
    assert.equal(result.subgenre, 'Ragatrance');
    assert.equal(result.confidence, 'HIGH');
  });

  // ==========================================================================
  // 4. STRICT 30 CANONICAL GENRE BOUNDING
  // ==========================================================================
  test('Strict 30 Canonical Genres: Arbitrary non-canonical strings never become canonical systems', () => {
    assert.equal(VALID_CANONICAL_GENRES.size, 30);
    assert.equal(isCanonicalGenre('French Pop'), false);
    assert.equal(isCanonicalGenre('Worldwide'), false);
    assert.equal(isCanonicalGenre('Soundtrack'), false);
    assert.equal(isCanonicalGenre('Psytrance'), true);
    assert.equal(isCanonicalGenre('R&B'), true);
    assert.equal(isCanonicalGenre('Pop'), true);

    // An unknown artist with completely unmapped non-canonical tags must abstain to Unknown
    const unmapped = evaluateGenreEvidence({
      artistName: 'Unknown Random Artist',
      spotifyGenres: ['spoken word', 'audiobook', 'soundtrack'],
    });
    assert.equal(unmapped.canonicalGenre, 'Unknown');
    assert.equal(unmapped.confidence, 'UNKNOWN');
    assert.equal(isCanonicalGenre(unmapped.canonicalGenre), false);
  });

  test('Microgenre mapping: French Pop maps to canonical Pop with French Pop subgenre', () => {
    // If a legitimate, verified source provides "french pop":
    // It maps to Pop canonical (the stellar system) with French Pop subgenre (the planet)
    const result = evaluateGenreEvidence({
      artistName: 'Authentic French Singer',
      spotifyGenres: ['french pop'],
    });
    assert.equal(result.canonicalGenre, 'Pop');
    assert.equal(result.subgenre, 'French Pop');
    assert.equal(isCanonicalGenre(result.canonicalGenre), true);
  });

  // ==========================================================================
  // 5. GENRE INFORMATION PARADOX INVARIANT
  // ==========================================================================
  test('Information Paradox: Contradictory evidence lowers confidence rather than raising it', () => {
    // Single unambiguous verified signal: synth-pop (score 83, confidence MEDIUM)
    const singleSignal = evaluateGenreEvidence({
      artistName: 'Testing Artist',
      spotifyGenres: ['synth-pop'],
    });
    assert.equal(singleSignal.canonicalGenre, 'Synth-pop');
    assert.equal(singleSignal.confidence, 'MEDIUM');
    assert.equal(singleSignal.conflictDetected, false);

    // Inject strong contradictory signal from unrelated genre family (Heavy Metal, weight 87)
    // Both signals are strong (~83 vs 87), ratio = 83/87 = 0.95 -> SEVERE conflict!
    const contradictorySignal = evaluateGenreEvidence({
      artistName: 'Testing Artist',
      spotifyGenres: ['synth-pop', 'heavy metal'],
    });
    assert.equal(contradictorySignal.conflictDetected, true);
    // Severe conflict between Synth-pop and Metal MUST downgrade confidence to LOW!
    assert.equal(contradictorySignal.confidence, 'LOW');
    assert.ok(contradictorySignal.confidenceScore < singleSignal.confidenceScore);
  });

  test('Multi-source convergence boosts confidence when independent sources agree', () => {
    // Single source: Spotify artist tag "progressive house"
    const single = evaluateGenreEvidence({
      artistName: 'DJ Producer',
      spotifyGenres: ['progressive house'],
    });

    // Converging sources: Spotify artist tag AND verified fallback song tag
    const converging = evaluateGenreEvidence({
      artistName: 'DJ Producer',
      trackTitle: 'Summer Anthem',
      spotifyGenres: ['progressive house'],
      fallbackGenres: ['progressive house'],
      fallbackArtistName: 'DJ Producer',
    });

    assert.equal(converging.canonicalGenre, 'Progressive House');
    assert.ok(converging.confidenceScore >= single.confidenceScore);
    assert.match(converging.selectionReason, /converging signals/i);
  });
});
