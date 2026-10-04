/**
 * SymphonyGraph External Fallback Identity Verification Engine
 *
 * Implements generic, rigorous identity verification for external metadata providers
 * (e.g., Apple Music / iTunes search API).
 * Prevents catalog pollution from track-title homonyms, substring conflations,
 * and multi-artist homonym collisions.
 */

import { findArtistKnowledge, normalizeArtistKey } from './artistKnowledge';

export type IdentityMatchGrade = 'EXACT' | 'STRONG_MATCH' | 'AMBIGUOUS' | 'MISMATCH';

export interface IdentityVerificationResult {
  grade: IdentityMatchGrade;
  isVerified: boolean;
  confidenceDiscount: number; // 0 = no penalty, 50 = heavily penalized / rejected
  reason: string;
}

/**
 * Strips common band/artist boilerplate words and formatting for core token comparison.
 */
function extractCoreTokens(name: string): string[] {
  const norm = normalizeArtistKey(name);
  return norm
    .split(' ')
    .filter((tok) => tok.length > 0 && !['the', 'and', 'or', 'feat', 'ft', 'band', 'project', 'music'].includes(tok));
}

/**
 * Calculates token overlap ratio between two artist names.
 */
function tokenOverlapRatio(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setB = new Set(tokensB);
  let shared = 0;
  for (const t of tokensA) {
    if (setB.has(t)) shared++;
  }
  return (2 * shared) / (tokensA.length + tokensB.length);
}

/**
 * Rigorously verifies whether an external search result represents the target artist
 * rather than an unrelated homonym or track-title collision.
 *
 * @param targetArtist The artist name requested by SymphonyGraph
 * @param candidateArtist The artist name returned by the external provider
 * @param targetTrack The optional track title requested
 * @param candidateTrack The optional track title returned by the external provider
 * @param candidateGenre The optional genre returned by the external provider
 */
export function verifyExternalArtistIdentity(
  targetArtist: string,
  candidateArtist: string,
  targetTrack?: string,
  candidateTrack?: string,
  candidateGenre?: string
): IdentityVerificationResult {
  const normTarget = normalizeArtistKey(targetArtist);
  const normCandidate = normalizeArtistKey(candidateArtist);

  // If candidate artist is not provided in response (e.g. minimal mock payload or uncredited track),
  // but candidate track matches the query track title (and targetTrack is distinct from targetArtist):
  if (!normCandidate && candidateTrack && targetTrack) {
    const normTargetTrack = normalizeArtistKey(targetTrack);
    const normCandTrack = normalizeArtistKey(candidateTrack);
    if (normTargetTrack && normCandTrack === normTargetTrack && normTargetTrack !== normTarget) {
      return {
        grade: 'STRONG_MATCH',
        isVerified: true,
        confidenceDiscount: 10,
        reason: `Song-level track title match ("${candidateTrack}") without explicit artist credit`,
      };
    }
  }

  if (!normTarget || !normCandidate) {
    return {
      grade: 'MISMATCH',
      isVerified: false,
      confidenceDiscount: 100,
      reason: 'Empty artist name provided for verification',
    };
  }

  // 1. Homonym Track-Title Attack Defense
  // Example: Query artist "Damru", external returns track "Damru" by artist "Siddharth Mohan".
  // If the returned track title matches the target artist name, but the returned artist does NOT match:
  if (candidateTrack) {
    const normCandTrack = normalizeArtistKey(candidateTrack);
    const trackMatchesTargetArtist = normCandTrack === normTarget || normCandTrack.includes(normTarget);
    const artistMatchesTarget = normCandidate === normTarget || normCandidate.includes(normTarget);

    if (trackMatchesTargetArtist && !artistMatchesTarget) {
      return {
        grade: 'MISMATCH',
        isVerified: false,
        confidenceDiscount: 100,
        reason: `Rejected track-title homonym: Candidate artist "${candidateArtist}" does not match target "${targetArtist}" despite track "${candidateTrack}" matching`,
      };
    }
  }

  // 2. Known Catalog Collision Guard (e.g. Guinea Pigs iTunes entity #191215671 returning Country)
  const targetKnowledge = findArtistKnowledge(normTarget);
  if (targetKnowledge && candidateGenre && targetKnowledge.collisionTarget) {
    const normGenre = candidateGenre.toLowerCase();
    const normCollTarget = targetKnowledge.collisionTarget.toLowerCase();
    if (normGenre.includes(normCollTarget) || normCollTarget.includes(normGenre)) {
      return {
        grade: 'MISMATCH',
        isVerified: false,
        confidenceDiscount: 100,
        reason: `Rejected documented catalog collision: Target "${targetArtist}" has verified collision defense against genre "${candidateGenre}"`,
      };
    }
  }

  // 3. Exact Identity Match
  if (normTarget === normCandidate) {
    return {
      grade: 'EXACT',
      isVerified: true,
      confidenceDiscount: 0,
      reason: `Exact artist identity match: "${candidateArtist}" matches "${targetArtist}"`,
    };
  }

  // 4. Token-level analysis
  const tokensTarget = extractCoreTokens(targetArtist);
  const tokensCandidate = extractCoreTokens(candidateArtist);
  const overlap = tokenOverlapRatio(tokensTarget, tokensCandidate);

  // Strong verified match (e.g. "Bob Marley" vs "Bob Marley & The Wailers", or "The Chemical Brothers" vs "Chemical Brothers")
  if (overlap >= 0.8 || (tokensTarget.length > 0 && tokensCandidate.every((t) => tokensTarget.includes(t)))) {
    return {
      grade: 'STRONG_MATCH',
      isVerified: true,
      confidenceDiscount: 10,
      reason: `Strong verified token match (${(overlap * 100).toFixed(0)}% overlap) between "${candidateArtist}" and "${targetArtist}"`,
    };
  }

  // Substring check with length guard
  // Permissive substring check is ONLY allowed if length difference is minimal
  // e.g. "Eve" vs "Steve" must be rejected!
  const isSubstring = normCandidate.includes(normTarget) || normTarget.includes(normCandidate);
  const lenDiff = Math.abs(normCandidate.length - normTarget.length);
  const minLen = Math.min(normCandidate.length, normTarget.length);

  if (isSubstring && lenDiff <= 4 && minLen >= 4 && overlap >= 0.5) {
    return {
      grade: 'STRONG_MATCH',
      isVerified: true,
      confidenceDiscount: 15,
      reason: `Close variant substring match between "${candidateArtist}" and "${targetArtist}"`,
    };
  }

  if (isSubstring) {
    // Ambiguous: one is a substring of the other but significant token difference
    return {
      grade: 'AMBIGUOUS',
      isVerified: false,
      confidenceDiscount: 50,
      reason: `Ambiguous substring match ("${candidateArtist}" vs "${targetArtist}") rejected for safe classification`,
    };
  }

  // Otherwise mismatch
  return {
    grade: 'MISMATCH',
    isVerified: false,
    confidenceDiscount: 100,
    reason: `Identity mismatch: Candidate "${candidateArtist}" does not match target "${targetArtist}"`,
  };
}
