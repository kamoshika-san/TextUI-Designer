// Semantic diff contract types for E-SD-01 Sprint 1.
// This file is the code-facing foundation for the semantic diff MVP contract.

export type ChangeLayer = 'structure' | 'behavior' | 'visual' | 'data';

export type ImpactLevel = 'low' | 'medium' | 'high';

export type SemanticChangeType =
  | 'AddComponent'
  | 'RemoveComponent'
  | 'MoveComponent'
  | 'UpdateProps'
  | 'UpdateLayout'
  | 'UpdateStyle'
  | 'UpdateCondition'
  | 'UpdateEvent'
  | 'UpdateBinding';

export type SemanticMvpChangeType =
  | 'AddComponent'
  | 'RemoveComponent'
  | 'MoveComponent'
  | 'UpdateProps'
  | 'UpdateEvent';

export type DeferredSemanticChangeType =
  | 'UpdateLayout'
  | 'UpdateStyle'
  | 'UpdateCondition'
  | 'UpdateBinding';

export type SemanticIdentityBasis =
  | 'stable-id'
  | 'slot-anchor'
  | 'owner-path'
  | 'event-handle'
  | 'binding-handle'
  | 'fallback';

export type SemanticAmbiguityReason =
  | 'missing-stable-anchor'
  | 'multiple-candidates'
  | 'cross-owner-reparent'
  | 'fallback-required';

export interface SemanticSourceRef {
  documentPath?: string;
  entityPath: string;
  line?: number;
  column?: number;
}

export type SemanticEvidenceSide = 'previous' | 'next';

export interface SemanticEvidenceNavigationTarget {
  side: SemanticEvidenceSide;
  documentPath?: string;
  entityPath: string;
  location: string;
}

export interface SemanticChangeNavigation {
  primary?: SemanticEvidenceNavigationTarget;
  previous?: SemanticEvidenceNavigationTarget;
  next?: SemanticEvidenceNavigationTarget;
}

export interface SemanticChangeEvidence {
  previous?: SemanticSourceRef;
  next?: SemanticSourceRef;
  relatedPaths?: string[];
  reasonSummary?: string;
  navigation?: SemanticChangeNavigation;
}

export interface SemanticChangeBase {
  type: SemanticChangeType;
  layer: ChangeLayer;
  componentId: string;
  identityBasis: SemanticIdentityBasis;
  ambiguityReason?: SemanticAmbiguityReason;
  evidence?: SemanticChangeEvidence;
  humanReadable?: HumanReadableChange;
}

export interface AddComponent extends SemanticChangeBase {
  type: 'AddComponent';
  layer: 'structure';
  parentId?: string;
  position?: number;
  componentKind?: string;
}

export interface RemoveComponent extends SemanticChangeBase {
  type: 'RemoveComponent';
  layer: 'structure';
  parentId?: string;
  componentKind?: string;
}

export interface MoveComponent extends SemanticChangeBase {
  type: 'MoveComponent';
  layer: 'structure';
  fromParentId?: string;
  toParentId?: string;
  fromPosition?: number;
  toPosition?: number;
}

export interface UpdateProps extends SemanticChangeBase {
  type: 'UpdateProps';
  layer: 'behavior' | 'visual';
  propKey: string;
  before: unknown;
  after: unknown;
}

export interface UpdateLayout extends SemanticChangeBase {
  type: 'UpdateLayout';
  layer: 'visual';
  propKey: string;
  before: unknown;
  after: unknown;
}

export interface UpdateStyle extends SemanticChangeBase {
  type: 'UpdateStyle';
  layer: 'visual';
  propKey: string;
  before: unknown;
  after: unknown;
}

export interface UpdateCondition extends SemanticChangeBase {
  type: 'UpdateCondition';
  layer: 'behavior';
  conditionKey: string;
  before: unknown;
  after: unknown;
}

export interface UpdateEvent extends SemanticChangeBase {
  type: 'UpdateEvent';
  layer: 'behavior';
  eventKey: string;
  before: unknown;
  after: unknown;
}

export interface UpdateBinding extends SemanticChangeBase {
  type: 'UpdateBinding';
  layer: 'data';
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

export interface HumanReadableChange {
  title: string;
  description: string;
  impact: ImpactLevel;
}

export type SemanticValueExplicitness = 'explicit' | 'absent' | 'derived-default';

export interface SemanticDiffIRValue {
  value: unknown;
  explicitness: SemanticValueExplicitness;
  sourceRef?: SemanticSourceRef;
}

export interface SemanticDiffIRScreen {
  screenKey: string;
  name?: string;
  route?: string;
  sourceRef?: SemanticSourceRef;
  rootNode: SemanticDiffIRNode;
}

export interface SemanticDiffIRNode {
  nodeId: string;
  componentKind: string;
  stableId?: string;
  screenKey: string;
  ownerPath: string;
  slotName?: string;
  sourceRef?: SemanticSourceRef;
  props: Record<string, SemanticDiffIRValue>;
  layout?: Record<string, SemanticDiffIRValue>;
  style?: Record<string, SemanticDiffIRValue>;
  events?: Record<string, SemanticDiffIRValue>;
  bindings?: Record<string, SemanticDiffIRValue>;
  conditions?: Record<string, SemanticDiffIRValue>;
  children: SemanticDiffIRNode[];
}

export interface SemanticDiffIRRoot {
  schemaVersion: 'semantic-diff-ir/v1';
  entryDocumentPath?: string;
  screens: SemanticDiffIRScreen[];
}

export function assertNeverSemanticChange(change: never): never {
  throw new Error(`Unhandled SemanticChange type: ${JSON.stringify(change)}`);
}
