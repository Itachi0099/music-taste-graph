/**
 * SymphonyGraph Genre Evidence & Deterministic Scoring Engine
 *
 * Implements multi-source evidence collation, provider collision detection,
 * deterministic candidate scoring, and first-class confidence derivation.
 */

import { findArtistKnowledge, normalizeArtistKey } from './artistKnowledge';
import { verifyExternalArtistIdentity } from './identityVerifier';
import {
  CANONICAL_SPECIFICITY_WEIGHTS,
  EVERY_NOISE_MICROGENRE_MAP,
  MORPHOLOGICAL_RULES,
} from './ontologyData';

export type GenreConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export interface GenreEvidenceItem {
  source:
    | 'artist_knowledge'
    | 'curated'
    | 'spotify_artist'
    | 'knowledge_ontology'
    | 'morphological'
    | 'fallback_song'
    | 'fallback_artist';
  rawGenre: string;
  matchedCanonical: string;
  derivedSubgenre: string;
  weight: number;
  notes?: string;
}

export interface ResolvedGenreKnowledgeResult {
  canonicalGenre: string;
  subgenre: string;
  confidence: GenreConfidenceLevel;
  confidenceScore: number;
  source: string;
  evidence: GenreEvidenceItem[];
  candidates: string[];
  selectionReason: string;
  conflictDetected: boolean;
  conflictResolution?: string;
}

export interface EvidenceQueryInput {
  artistName: string;
  trackTitle?: string;
  spotifyGenres?: string[] | string | null;
  fallbackGenres?: string[] | string | null;
  fallbackArtistName?: string;
}

/**
 * Cleanly capitalizes arbitrary genre strings
 */
export function cleanGenreString(str: string): string {
  if (!str) return 'Unknown';
  return str
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Evaluates multiple evidence sources and resolves canonical genre and subgenre
 * with explainable deterministic scoring and confidence tracking.
 */
export function evaluateGenreEvidence(input: EvidenceQueryInput): ResolvedGenreKnowledgeResult {
  const normArtist = normalizeArtistKey(input.artistName || '');
  const evidenceList: GenreEvidenceItem[] = [];

  // 1. Consult Structured Artist Knowledge Registry (Generic, data-driven identity & collision defense)
  const artistKnowledge = findArtistKnowledge(normArtist);
  if (artistKnowledge) {
    evidenceList.push({
      source: 'artist_knowledge',
      rawGenre: artistKnowledge.verifiedGenres[0] || artistKnowledge.primarySubgenre.toLowerCase(),
      matchedCanonical: artistKnowledge.primaryCanonical,
      derivedSubgenre: artistKnowledge.primarySubgenre,
      weight: 120, // Authoritative verified signal
      notes: `${artistKnowledge.provenance}: ${artistKnowledge.disambiguationNotes}`,
    });
  }

  // 2. Collate Spotify runtime genre evidence
  const rawSpotifyGenres: string[] = [];
  if (Array.isArray(input.spotifyGenres)) {
    rawSpotifyGenres.push(...input.spotifyGenres);
  } else if (typeof input.spotifyGenres === 'string' && input.spotifyGenres.trim().length > 0) {
    rawSpotifyGenres.push(input.spotifyGenres);
  }

  for (const raw of rawSpotifyGenres) {
    const clean = raw.trim().toLowerCase();
    if (!clean || clean === 'unknown') continue;

    // A. Check exact Every Noise microgenre map
    if (EVERY_NOISE_MICROGENRE_MAP[clean]) {
      const [canonical, subgenre] = EVERY_NOISE_MICROGENRE_MAP[clean];
      const baseSpecificity = CANONICAL_SPECIFICITY_WEIGHTS[canonical] || 75;
      const isExactCanonical = clean === canonical.toLowerCase();
      const isSpecificSubgenre = subgenre.toLowerCase() !== canonical.toLowerCase();
      const weight = baseSpecificity + (isExactCanonical ? 15 : isSpecificSubgenre ? 5 : 0);
      evidenceList.push({
        source: 'knowledge_ontology',
        rawGenre: raw,
        matchedCanonical: canonical,
        derivedSubgenre: subgenre,
        weight,
        notes: `Exact Every Noise ontology match for "${clean}"`,
      });
      continue;
    }

    // B. Check morphological compound rules
    let morphMatched = false;
    for (const rule of MORPHOLOGICAL_RULES) {
      if (rule.pattern.test(clean)) {
        const subgenre = rule.subgenreDeriver(clean);
        const baseSpecificity = CANONICAL_SPECIFICITY_WEIGHTS[rule.canonical] || rule.baseWeight;
        const isExactCanonical = clean === rule.canonical.toLowerCase();
        const isSpecificSubgenre = subgenre.toLowerCase() !== rule.canonical.toLowerCase();
        const weight = baseSpecificity + (isExactCanonical ? 15 : isSpecificSubgenre ? 5 : 0);
        evidenceList.push({
          source: 'morphological',
          rawGenre: raw,
          matchedCanonical: rule.canonical,
          derivedSubgenre: subgenre,
          weight,
          notes: `Morphological compound pattern match for "${clean}"`,
        });
        morphMatched = true;
        break;
      }
    }

    if (!morphMatched) {
      // Direct raw Spotify genre fallback
      evidenceList.push({
        source: 'spotify_artist',
        rawGenre: raw,
        matchedCanonical: cleanGenreString(raw),
        derivedSubgenre: cleanGenreString(raw),
        weight: 50,
        notes: `Uncategorized Spotify genre tag "${raw}"`,
      });
    }
  }

  // 3. Collate external provider fallback evidence (with rigorous identity & homonym verification)
  const rawFallbackGenres: string[] = [];
  if (Array.isArray(input.fallbackGenres)) {
    rawFallbackGenres.push(...input.fallbackGenres);
  } else if (typeof input.fallbackGenres === 'string' && input.fallbackGenres.trim().length > 0) {
    rawFallbackGenres.push(input.fallbackGenres);
  }

  for (const raw of rawFallbackGenres) {
    const clean = raw.trim().toLowerCase();
    if (!clean || clean === 'unknown') continue;

    // Strict generic identity verification
    const verification = input.fallbackArtistName
      ? verifyExternalArtistIdentity(
          input.artistName,
          input.fallbackArtistName,
          input.trackTitle,
          undefined,
          raw
        )
      : { grade: 'EXACT', isVerified: true, confidenceDiscount: 0, reason: 'No fallback artist name supplied' };

    // If completely mismatched or identified as track-title homonym / collision, reject immediately
    if (!verification.isVerified && verification.confidenceDiscount >= 100) {
      continue;
    }

    const weightDiscount = verification.confidenceDiscount;

    if (EVERY_NOISE_MICROGENRE_MAP[clean]) {
      const [canonical, subgenre] = EVERY_NOISE_MICROGENRE_MAP[clean];
      const baseSpecificity = CANONICAL_SPECIFICITY_WEIGHTS[canonical] || 75;
      const isExactCanonical = clean === canonical.toLowerCase();
      const isSpecificSubgenre = subgenre.toLowerCase() !== canonical.toLowerCase();
      const weight = Math.max(10, baseSpecificity + (isExactCanonical ? 15 : isSpecificSubgenre ? 5 : 0) - weightDiscount);
      evidenceList.push({
        source: input.trackTitle ? 'fallback_song' : 'fallback_artist',
        rawGenre: raw,
        matchedCanonical: canonical,
        derivedSubgenre: subgenre,
        weight,
        notes: `External provider match for "${clean}": ${verification.reason}`,
      });
      continue;
    }

    for (const rule of MORPHOLOGICAL_RULES) {
      if (rule.pattern.test(clean)) {
        const subgenre = rule.subgenreDeriver(clean);
        const baseSpecificity = CANONICAL_SPECIFICITY_WEIGHTS[rule.canonical] || rule.baseWeight;
        const isExactCanonical = clean === rule.canonical.toLowerCase();
        const isSpecificSubgenre = subgenre.toLowerCase() !== rule.canonical.toLowerCase();
        const weight = Math.max(10, baseSpecificity + (isExactCanonical ? 15 : isSpecificSubgenre ? 5 : 0) - weightDiscount);
        evidenceList.push({
          source: input.trackTitle ? 'fallback_song' : 'fallback_artist',
          rawGenre: raw,
          matchedCanonical: rule.canonical,
          derivedSubgenre: subgenre,
          weight,
          notes: `External fallback morphological match for "${clean}": ${verification.reason}`,
        });
        break;
      }
    }
  }

  // 4. If zero evidence collected, return honest Unknown
  if (evidenceList.length === 0) {
    return {
      canonicalGenre: 'Unknown',
      subgenre: 'Unknown',
      confidence: 'UNKNOWN',
      confidenceScore: 0,
      source: 'unknown',
      evidence: [],
      candidates: [],
      selectionReason: 'Insufficient reliable genre evidence across providers',
      conflictDetected: false,
    };
  }

  // 5. Deterministic Candidate Scoring
  interface ScoredCandidate {
    canonical: string;
    subgenre: string;
    totalScore: number;
    evidenceCount: number;
    highestWeight: number;
    sources: Set<string>;
    bestSubgenre: string;
  }

  const candidateMap = new Map<string, ScoredCandidate>();

  for (const item of evidenceList) {
    if (!candidateMap.has(item.matchedCanonical)) {
      candidateMap.set(item.matchedCanonical, {
        canonical: item.matchedCanonical,
        subgenre: item.derivedSubgenre,
        totalScore: item.weight,
        evidenceCount: 1,
        highestWeight: item.weight,
        sources: new Set([item.source]),
        bestSubgenre: item.derivedSubgenre,
      });
    } else {
      const existing = candidateMap.get(item.matchedCanonical)!;
      existing.totalScore += item.weight * 0.5; // Diminishing returns for multiple signals in same family
      existing.evidenceCount++;
      existing.sources.add(item.source);

      // Prefer specific subgenre over generic repetition
      const isCurrentGeneric = existing.bestSubgenre.toLowerCase() === existing.canonical.toLowerCase();
      const isNewSpecific = item.derivedSubgenre.toLowerCase() !== item.matchedCanonical.toLowerCase();

      if (isCurrentGeneric && isNewSpecific) {
        existing.bestSubgenre = item.derivedSubgenre;
      } else if (!isCurrentGeneric && !isNewSpecific) {
        // Retain existing specific subgenre
      } else if (item.weight > existing.highestWeight) {
        existing.highestWeight = item.weight;
        existing.bestSubgenre = item.derivedSubgenre;
      }
    }
  }

  // Multi-source convergence bonus
  for (const candidate of candidateMap.values()) {
    if (candidate.sources.size > 1) {
      candidate.totalScore += 25; // Bonus for independent multi-source agreement
    }
  }

  // Detect conflict
  const sortedCandidates = Array.from(candidateMap.values()).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.highestWeight !== a.highestWeight) return b.highestWeight - a.highestWeight;
    const aBase = CANONICAL_SPECIFICITY_WEIGHTS[a.canonical] || 70;
    const bBase = CANONICAL_SPECIFICITY_WEIGHTS[b.canonical] || 70;
    if (bBase !== aBase) return bBase - aBase;
    return a.canonical.localeCompare(b.canonical);
  });

  const winner = sortedCandidates[0];
  const second = sortedCandidates[1];

  let conflictDetected = false;
  let conflictResolution: string | undefined;

  if (second && second.canonical !== winner.canonical && second.totalScore >= winner.totalScore * 0.75) {
    conflictDetected = true;
    conflictResolution = `Resolved conflict between ${winner.canonical} (${winner.totalScore.toFixed(0)}) and ${second.canonical} (${second.totalScore.toFixed(0)}) via specificity weighting and source convergence.`;
  }

  // 6. Confidence Level Derivation
  let confidence: GenreConfidenceLevel = 'UNKNOWN';
  if (
    winner.totalScore >= 100 ||
    (winner.sources.size > 1 && winner.totalScore >= 85) ||
    winner.sources.has('artist_knowledge') ||
    winner.sources.has('curated')
  ) {
    confidence = 'HIGH';
  } else if (winner.totalScore >= 60) {
    confidence = 'MEDIUM';
  } else if (winner.totalScore >= 35) {
    confidence = 'LOW';
  } else {
    confidence = 'UNKNOWN';
  }

  const confidenceScore = Math.min(1.0, Number((winner.totalScore / 130).toFixed(2)));
  const uniqueCandidateNames = sortedCandidates.map((c) => c.canonical);

  const primarySource = winner.sources.has('artist_knowledge')
    ? 'knowledge_engine'
    : winner.sources.has('curated')
      ? 'curated'
      : winner.sources.has('knowledge_ontology')
        ? 'knowledge_engine'
        : winner.sources.has('spotify_artist')
          ? 'spotify'
          : winner.sources.has('fallback_song')
            ? 'fallback_song'
            : 'fallback_artist';

  return {
    canonicalGenre: winner.canonical,
    subgenre: winner.bestSubgenre,
    confidence,
    confidenceScore,
    source: primarySource,
    evidence: evidenceList,
    candidates: uniqueCandidateNames,
    selectionReason: winner.sources.size > 1
      ? `Multiple converging signals (${Array.from(winner.sources).join(', ')}) resolved to ${winner.canonical} with score ${winner.totalScore.toFixed(0)}`
      : `Primary signal from ${primarySource} matched ${winner.canonical} with score ${winner.totalScore.toFixed(0)}`,
    conflictDetected,
    conflictResolution,
  };
}
