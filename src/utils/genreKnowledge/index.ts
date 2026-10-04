/**
 * SymphonyGraph Genre Knowledge Engine
 *
 * Provides a local, deterministic, explainable genre evidence and taxonomy engine
 * derived from Every Noise at Once and open music ontologies.
 *
 * In accordance with Spotify Developer Terms, NO machine-learning or AI model
 * is trained on Spotify data.
 */

export * from './ontologyData';
export * from './evidenceEngine';

import { evaluateGenreEvidence, type EvidenceQueryInput, type ResolvedGenreKnowledgeResult } from './evidenceEngine';

/**
 * Resolves an artist's genre using the local Knowledge Engine.
 */
export function resolveGenreWithKnowledge(input: EvidenceQueryInput): ResolvedGenreKnowledgeResult {
  return evaluateGenreEvidence(input);
}
