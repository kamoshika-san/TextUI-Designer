import type {
  DiffCompareResult,
  DiffEvent,
  DiffEventKind,
  DiffIdentitySource,
  DiffFallbackMarker,
  DiffFallbackConfidence,
  DiffPairingReason,
} from './textui-core-diff';

// -- Pairing classification --------------------------------------------------

/**
 * Coarse pairing class derived from DiffPairingReason.
 * 'deterministic' means the engine resolved identity without ambiguity.
 * 'heuristic'    means similarity scoring was used; continuity is inferred.
 * 'unpaired'     means no match was found; likely a remove+add pair.
 */
export type DiffPairingClass = 'deterministic' | 'heuristic' | 'unpaired';

// -- Per-event trace record --------------------------------------------------

/**
 * Diagnostics trace for one DiffEvent.  Carries all pairing and classification
 * signals so that reviewers and tooling can audit why an event was classified
 * the way it was.
 *
 * This type is diagnostics-only. It must never be embedded into DiffCompareResult
 * or any runtime payload—it is a read-only projection over DiffCompareResult.
 */
export interface DiffEventTrace {
  /** Copied from DiffEvent.eventId. */
  eventId: string;
  /** Copied from DiffEvent.kind. */
  eventKind: DiffEventKind;
  /**
   * Coarse pairing classification derived from pairingReason.
   * Use this for aggregate counts and grouping rather than inspecting
   * the raw pairingReason value.
   */
  pairingClass: DiffPairingClass;
  /** Raw identity source from DiffEvent.trace.identitySource. */
  identitySource: DiffIdentitySource;
  /** Raw pairing reason from DiffEvent.trace.pairingReason. */
  pairingReason: DiffPairingReason;
  /** Raw fallback marker from DiffEvent.trace.fallbackMarker. */
  fallbackMarker: DiffFallbackMarker;
  /** Raw fallback confidence from DiffEvent.trace.fallbackConfidence. */
  fallbackConfidence: DiffFallbackConfidence;
  /**
   * Compact human-readable explanation combining pairing reason, identity source,
   * and any fallback signal.  Suitable for diagnostic output and log lines.
   * Example: "paired by explicit id, identity:explicit-id"
   * Example: "paired by heuristic similarity, identity-source:none, fallback:heuristic-pending confidence:high"
   */
  reasonSummary: string;
  /**
   * True when this event carries any fallback or ambiguity signal
   * (fallbackMarker !== 'none').  Convenience flag for downstream filtering.
   */
  hasFallback: boolean;
}

// -- Aggregated summary -----------------------------------------------------

export interface DiffDiagnosticsSummary {
  totalEvents: number;
  deterministicCount: number;
  heuristicCount: number;
  unpairedCount: number;
  /** Number of events where hasFallback is true. */
  fallbackCount: number;
}

// -- Top-level diagnostics result -------------------------------------------

/**
 * Diagnostics projection over a DiffCompareResult.
 *
 * Not a runtime payload type—consume via buildDiffDiagnostics() only.
 * The 'kind' discriminant exists so callers can pattern-match without
 * instanceof or duck-typing.
 */
export interface DiffDiagnosticsResult {
  kind: 'diff-diagnostics-result';
  /** One trace record per DiffEvent, ordered by event position in DiffCompareResult.events. */
  traces: DiffEventTrace[];
  summary: DiffDiagnosticsSummary;
}

// -- Internal helpers -------------------------------------------------------

function classifyPairing(pairingReason: DiffPairingReason): DiffPairingClass {
  if (pairingReason === 'heuristic-similarity') {
    return 'heuristic';
  }
  if (pairingReason === 'unpaired') {
    return 'unpaired';
  }
  return 'deterministic';
}

function buildReasonSummary(
  pairingReason: DiffPairingReason,
  identitySource: DiffIdentitySource,
  fallbackMarker: DiffFallbackMarker,
  fallbackConfidence: DiffFallbackConfidence
): string {
  const parts: string[] = [];

  switch (pairingReason) {
    case 'deterministic-explicit-id':
      parts.push('paired by explicit id');
      break;
    case 'deterministic-fallback-key':
      parts.push('paired by fallback key');
      break;
    case 'deterministic-structural-path':
      parts.push('paired by structural path');
      break;
    case 'heuristic-similarity':
      parts.push('paired by heuristic similarity');
      break;
    case 'unpaired':
      parts.push('unpaired');
      break;
  }

  if (pairingReason === 'heuristic-similarity') {
    parts.push('identity-source:none');
  } else if (identitySource !== 'none') {
    parts.push(`identity:${identitySource}`);
  }

  if (fallbackMarker === 'remove-add-fallback') {
    parts.push('fallback:remove-add');
  } else if (fallbackMarker === 'heuristic-pending') {
    parts.push(`fallback:heuristic-pending confidence:${fallbackConfidence}`);
  }

  return parts.join(', ');
}

function buildEventTrace(event: DiffEvent): DiffEventTrace {
  const { identitySource, pairingReason, fallbackMarker, fallbackConfidence } = event.trace;
  const pairingClass = classifyPairing(pairingReason);
  const hasFallback = fallbackMarker !== 'none';

  return {
    eventId: event.eventId,
    eventKind: event.kind,
    pairingClass,
    identitySource,
    pairingReason,
    fallbackMarker,
    fallbackConfidence,
    reasonSummary: buildReasonSummary(pairingReason, identitySource, fallbackMarker, fallbackConfidence),
    hasFallback,
  };
}

// -- Public API -------------------------------------------------------------

/**
 * Build a diagnostics projection from a DiffCompareResult.
 *
 * The result is a read-only surface for reviewer tooling and debug output.
 * It does not modify the input result and carries no runtime state.
 *
 * @param result - The compare result produced by createDiffResultSkeleton or
 *                 a fully resolved downstream pipeline result.
 */
export function buildDiffDiagnostics(result: DiffCompareResult): DiffDiagnosticsResult {
  const traces = result.events.map(buildEventTrace);

  let deterministicCount = 0;
  let heuristicCount = 0;
  let unpairedCount = 0;
  let fallbackCount = 0;

  for (const trace of traces) {
    if (trace.pairingClass === 'deterministic') {
      deterministicCount++;
    } else if (trace.pairingClass === 'heuristic') {
      heuristicCount++;
    } else {
      unpairedCount++;
    }
    if (trace.hasFallback) {
      fallbackCount++;
    }
  }

  return {
    kind: 'diff-diagnostics-result',
    traces,
    summary: {
      totalEvents: traces.length,
      deterministicCount,
      heuristicCount,
      unpairedCount,
      fallbackCount,
    },
  };
}
