/**
 * External diff result contract types (Epic E, E1-1).
 *
 * These types define the stable public contract for consumers of diff result
 * output (CI tools, review formatters, external adapters).  They are
 * intentionally decoupled from the internal DiffCompareResult shape.
 *
 * The matching JSON Schema is at schemas/diff-result-external-v0.json.
 *
 * Design rules:
 * - Do NOT import from textui-core-diff here (no internal type coupling).
 * - Fields added in later versions must be optional to stay backwards-compatible.
 * - Breaking changes (removals, semantic reinterpretations) require a new
 *   schemaVersion value and a migration path defined in Epic E3.
 */

// -- Version -----------------------------------------------------------------

export type DiffResultExternalSchemaVersion = 'diff-result-external/v0';

// -- Event vocabulary --------------------------------------------------------

export type DiffExternalEventKind =
  | 'add'
  | 'remove'
  | 'update'
  | 'reorder'
  | 'move'
  | 'rename'
  | 'remove+add';

export type DiffExternalEntityKind = 'page' | 'component' | 'property' | 'flow' | 'transition';

/**
 * How the previous and next entities were matched.
 * 'unpaired' means no match was found — paired with 'remove+add' kind.
 */
export type DiffExternalPairingReason =
  | 'deterministic-explicit-id'
  | 'deterministic-fallback-key'
  | 'deterministic-structural-path'
  | 'heuristic-similarity'
  | 'unpaired';

/**
 * Fallback signal indicating pairing certainty level.
 * 'none' = deterministic and unambiguous.
 * 'heuristic-pending' = similarity-scored; classification may be uncertain.
 * 'remove-add-fallback' = kind mismatch forced remove+add interpretation.
 */
export type DiffExternalFallbackMarker =
  | 'none'
  | 'heuristic-pending'
  | 'remove-add-fallback';

// -- Source ref --------------------------------------------------------------

export interface DiffExternalSourceRef {
  /** Page identifier from the compared document. */
  pageId: string;
  /** File path of the compared document. Optional. */
  sourcePath?: string;
}

// -- Producer metadata -------------------------------------------------------

/**
 * Identifies the engine and pipeline stage that produced this diff result.
 * Consumers must treat compareStage as opaque — it is traceability metadata,
 * not a branching signal.
 */
export interface DiffResultProducer {
  /** Engine identifier, e.g. 'textui-diff-core'. */
  engine: string;
  /** Semver version of the engine, e.g. '0.7.2'. */
  engineVersion: string;
  /**
   * Internal pipeline stage label at capture time, e.g. 'c1-skeleton'.
   * Informational only.
   */
  compareStage: string;
  /** ISO 8601 UTC timestamp when this result was produced. Optional. */
  producedAt?: string;
}

// -- Event -------------------------------------------------------------------

/**
 * One diff event representing a single entity change.
 * Only contract-stable fields are exposed here.
 */
export interface DiffExternalEvent {
  /** Stable identifier for this event within this result. */
  eventId: string;
  kind: DiffExternalEventKind;
  entityKind: DiffExternalEntityKind;
  pairingReason: DiffExternalPairingReason;
  fallbackMarker: DiffExternalFallbackMarker;
  /** Structural path in previous document. Absent for 'add' events. */
  previousPath?: string;
  /** Structural path in next document. Absent for 'remove' events. */
  nextPath?: string;
}

// -- Metadata ----------------------------------------------------------------

export interface DiffExternalMetadata {
  /** Total number of diff events. */
  eventCount: number;
  previousSource: DiffExternalSourceRef;
  nextSource: DiffExternalSourceRef;
}

// -- Root --------------------------------------------------------------------

/**
 * Top-level external diff result payload.
 *
 * Discriminated by `kind: 'textui-diff-result-external'`.
 * Validate against schemas/diff-result-external-v0.json before consuming.
 */
export interface DiffResultExternal {
  kind: 'textui-diff-result-external';
  schemaVersion: DiffResultExternalSchemaVersion;
  producer: DiffResultProducer;
  events: DiffExternalEvent[];
  metadata: DiffExternalMetadata;
}
