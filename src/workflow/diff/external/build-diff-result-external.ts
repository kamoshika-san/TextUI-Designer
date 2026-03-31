/**
 * buildDiffResultExternal: projects DiffCompareResult → DiffResultExternal.
 *
 * Purpose (T-20260401-001, Epic L Sprint L1):
 *   Establish a stable external contract for diff result output. Only
 *   contract-safe fields are included in events[]. Internal pairing detail
 *   beyond pairingReason and fallbackMarker is intentionally excluded.
 *
 * Determinism guarantee:
 *   Given identical inputs the output is identical except for `producer.producedAt`
 *   (which is always the call-time ISO timestamp). Event order is preserved from
 *   the input events[].
 *
 * Design rules:
 *   - Do NOT import from textui-diff-result-external (no circular coupling via core).
 *     The external types are re-exported here from the canonical SSOT in src/core/.
 *   - No internal DiffEvent fields other than the contract-safe set may appear
 *     in DiffExternalEvent.
 */

import type { DiffCompareResult } from '../../../core/textui-core-diff';
import type {
  DiffResultExternal,
  DiffExternalEvent,
  DiffExternalSourceRef,
  DiffResultProducer
} from '../../../core/textui-diff-result-external';

// Re-export the external types so callers can import from a single path.
export type {
  DiffResultExternal,
  DiffExternalEvent,
  DiffExternalSourceRef,
  DiffResultProducer
} from '../../../core/textui-diff-result-external';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface BuildDiffResultExternalOpts {
  /** Source reference for the previous-side document. */
  previousSource: DiffExternalSourceRef;
  /** Source reference for the next-side document. */
  nextSource: DiffExternalSourceRef;
  /** Producer metadata identifying the engine / pipeline stage. */
  producer: Omit<DiffResultProducer, 'producedAt'> & { producedAt?: string };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Project a DiffCompareResult to the stable DiffResultExternal contract.
 *
 * @param input   Internal diff result from the compare engine.
 * @param opts    Source references and producer metadata.
 * @returns       A DiffResultExternal payload ready for schema validation and
 *                artifact writing.
 */
export function buildDiffResultExternal(
  input: DiffCompareResult,
  opts: BuildDiffResultExternalOpts
): DiffResultExternal {
  const events: DiffExternalEvent[] = input.events.map(e => {
    // Extract only contract-safe fields. Destructure explicitly so that adding
    // new internal fields to DiffEvent does not silently leak them.
    const event: DiffExternalEvent = {
      eventId: e.eventId,
      kind: e.kind,
      entityKind: e.entityKind,
      pairingReason: e.trace.pairingReason,
      fallbackMarker: e.trace.fallbackMarker
    };

    // prevPath / nextPath: derive from trace source refs if available.
    const prevPath = e.trace.previousSourceRef?.entityPath;
    const nextPath = e.trace.nextSourceRef?.entityPath;
    if (prevPath !== undefined) {
      event.previousPath = prevPath;
    }
    if (nextPath !== undefined) {
      event.nextPath = nextPath;
    }

    return event;
  });

  const producer: DiffResultProducer = {
    engine: opts.producer.engine,
    engineVersion: opts.producer.engineVersion,
    compareStage: opts.producer.compareStage,
    producedAt: opts.producer.producedAt ?? new Date().toISOString()
  };

  return {
    kind: 'textui-diff-result-external',
    schemaVersion: 'diff-result-external/v0',
    producer,
    events,
    metadata: {
      eventCount: events.length,
      previousSource: opts.previousSource,
      nextSource: opts.nextSource
    }
  };
}
