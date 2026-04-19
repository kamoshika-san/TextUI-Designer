/**
 * Re-export barrel for the split diff modules.
 *
 * Consumers can continue to import from `textui-core-diff` without changes.
 * Implementation has been split into:
 *   - ./diff/diff-types.ts       — shared type definitions
 *   - ./diff/diff-pairing.ts     — heuristic pairing and identity logic
 *   - ./diff/structure-diff.ts   — structure diff engine
 *   - ./diff/flow-diff.ts        — navigation flow diff engine
 */

// ---- Types ----------------------------------------------------------------
export type {
  V2DiffEvent,
  V2ReviewStatus,
  V2DiffDecision,
  V2DiffExplanation,
  V2DiffRecord,
  V2ComponentDiff,
  V2EntityDiff,
  V2ScreenDiff,
  DiffCompareResultV2Payload,
} from './diff/diff-v2-types';

export type {
  DiffCompareSide,
  DiffEntityKind,
  DiffEntityStatus,
  DiffEventKind,
  DiffIdentitySource,
  DiffFallbackMarker,
  DiffExplicitnessMarker,
  DiffPairingReason,
  DiffFallbackConfidence,
  DiffHeuristicRejection,
  DiffHeuristicTrace,
  DiffCompareDocument,
  FlowDiffScreenRef,
  FlowDiffTransitionRef,
  FlowDiffCompareDocument,
  FlowDiffEvent,
  FlowDiffNormalizationResult,
  DiffEntityRef,
  DiffSourceRef,
  DiffAmbiguityReason,
  DiffTracePayload,
  DiffEvent,
  DiffEntityResult,
  DiffCompareResult,
  DiffRenderTargetScope,
  DiffRenderTargetResolution,
  DiffRenderTargetRef,
  DiffRenderTarget,
} from './diff/diff-types';

// ---- Pairing --------------------------------------------------------------
export { isHeuristicAllowed } from './diff/diff-pairing';

// ---- Structure diff -------------------------------------------------------
export {
  buildRenderTargetsFromDiffResult,
  createNormalizedDiffDocument,
  createDiffResultSkeleton,
} from './diff/structure-diff';

// ---- Flow diff ------------------------------------------------------------
export {
  createNormalizedFlowDiffDocument,
  createFlowTransitionKey,
  createFlowScreenKey,
} from './diff/flow-diff';

// ---- Provider (v1/v2 seam) ------------------------------------------------
export type { SemanticDiffProvider } from './diff/diff-provider';
export { V1SemanticDiffProvider, V2SemanticDiffProvider } from './diff/diff-provider';
