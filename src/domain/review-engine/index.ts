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
  Decision,
  Impact,
  Cluster,
  DiffIR
} from './diff-ir';

export type { PipelineStage, PipelineResult } from './review-pipeline';
export { ReviewPipeline } from './review-pipeline';

export { semanticDiffToDiffIR } from './adapters/semantic-diff-adapter';
