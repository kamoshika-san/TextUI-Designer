/**
 * Review Engine — パブリック API エントリポイント
 *
 * 外部からは必ずこのモジュール経由でインポートする。
 * 個別ファイルへの直接 import は SSoT ガードにより禁止。
 */

export type {
  ChangeId,
  Change,
  ChangeMetadata,
  Impact,
  Cluster,
  DiffIR
} from './diff-ir';

export type { PipelineStage, PipelineResult } from './review-pipeline';
export { ReviewPipeline } from './review-pipeline';

export { semanticDiffToDiffIR } from './adapters/semantic-diff-adapter';

export type { DecisionKind, Decision, DecisionStore } from './decision';
export { requiresRationale, validateDecision, InMemoryDecisionStore } from './decision';
export { DecisionJsonStore } from './decision-store';

export type { ClassType } from './change-classifier';
export { classifySemanticChangeType, classifyChange, classifyChanges } from './change-classifier';

export type { DependencyEdgeKind, DependencyNode, DependencyEdge, GraphMeta, DependencyGraph } from './dependency-graph';
export { buildDependencyGraph } from './dependency-graph';
