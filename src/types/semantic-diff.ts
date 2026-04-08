// Semantic Diff Types — E-SD0 Sprint SD0-S1
// These types form the foundational contract for all semantic diff epics (SD0–SD4).

// ---------------------------------------------------------------------------
// Layer classification for change grouping
// ---------------------------------------------------------------------------

export type ChangeLayer = 'structure' | 'behavior' | 'visual' | 'data';

// ---------------------------------------------------------------------------
// Atomic change types (SemanticChange union — 9 kinds)
// ---------------------------------------------------------------------------

export interface AddComponent {
  type: 'AddComponent';
  componentId: string;
  parentId?: string;
  position?: number;
}

export interface RemoveComponent {
  type: 'RemoveComponent';
  componentId: string;
  parentId?: string;
}

export interface MoveComponent {
  type: 'MoveComponent';
  componentId: string;
  fromParentId?: string;
  toParentId?: string;
  fromPosition?: number;
  toPosition?: number;
}

export interface UpdateProps {
  type: 'UpdateProps';
  componentId: string;
  propKey: string;
  before: unknown;
  after: unknown;
}

export interface UpdateLayout {
  type: 'UpdateLayout';
  componentId: string;
  propKey: string;
  before: unknown;
  after: unknown;
}

export interface UpdateStyle {
  type: 'UpdateStyle';
  componentId: string;
  propKey: string;
  before: unknown;
  after: unknown;
}

export interface UpdateCondition {
  type: 'UpdateCondition';
  componentId: string;
  conditionKey: string;
  before: unknown;
  after: unknown;
}

export interface UpdateEvent {
  type: 'UpdateEvent';
  componentId: string;
  eventKey: string;
  before: unknown;
  after: unknown;
}

export interface UpdateBinding {
  type: 'UpdateBinding';
  componentId: string;
  bindingKey: string;
  before: unknown;
  after: unknown;
}

export type SemanticChange =
  | AddComponent
  | RemoveComponent
  | MoveComponent
  | UpdateProps
  | UpdateLayout
  | UpdateStyle
  | UpdateCondition
  | UpdateEvent
  | UpdateBinding;

// ---------------------------------------------------------------------------
// Output model
// ---------------------------------------------------------------------------

export interface DiffSummary {
  added: number;
  removed: number;
  modified: number;
  moved: number;
}

export interface ChangeGroup {
  type: ChangeLayer;
  changes: SemanticChange[];
}

export interface SemanticDiff {
  summary: DiffSummary;
  changes: SemanticChange[];
  grouped: ChangeGroup[];
}

// ---------------------------------------------------------------------------
// Human-readable description (per change)
// ---------------------------------------------------------------------------

export type ImpactLevel = 'low' | 'medium' | 'high';

export interface HumanReadableChange {
  title: string;
  description: string;
  impact: ImpactLevel;
}

// ---------------------------------------------------------------------------
// Exhaustiveness check helper (compile-time guard)
// Ensures all SemanticChange variants are handled in switch/case.
// ---------------------------------------------------------------------------

export function assertNeverSemanticChange(change: never): never {
  throw new Error(`Unhandled SemanticChange type: ${JSON.stringify(change)}`);
}
