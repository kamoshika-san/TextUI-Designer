/**
 * HeuristicPolicy — configurable weights and thresholds for heuristic pairing.
 *
 * All magic numbers in the heuristic scoring engine are defined here.
 * DEFAULT_HEURISTIC_POLICY reproduces the original hard-coded behaviour exactly.
 */
export interface HeuristicPolicy {
  /** Minimum score required to accept a heuristic pair. */
  minScore: number;
  /** Score added per matching scalar property (exact normalised value). */
  weightScalarExact: number;
  /** Score added when both nodes share the same child-collection signature. */
  weightChildSignature: number;
  /** Score added when both nodes have the same set of scalar property keys. */
  weightKeysetMatch: number;
  /** When true, a pair is only accepted if it is the mutual best match. */
  requireMutualBest: boolean;
  /** When true, a tied best score is rejected (not accepted). */
  rejectTie: boolean;
}

export const DEFAULT_HEURISTIC_POLICY: HeuristicPolicy = {
  minScore: 2,
  weightScalarExact: 2,
  weightChildSignature: 1,
  weightKeysetMatch: 1,
  requireMutualBest: true,
  rejectTie: true,
};

/**
 * Compute a short, reproducible hash string for a policy object.
 * Uses a deterministic FNV-1a-style 32-bit hash over the JSON representation
 * with sorted keys, then returns the first 4 hex digits.
 *
 * Collisions are possible but acceptable for diagnostic/reproducibility use.
 */
export function computePolicyHash(policy: HeuristicPolicy): string {
  const json = JSON.stringify(policy, Object.keys(policy as unknown as Record<string, unknown>).sort());
  let h = 2166136261;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0').slice(0, 4);
}
