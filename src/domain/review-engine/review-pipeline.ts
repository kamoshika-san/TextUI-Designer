/**
 * Review Engine — ReviewPipeline 骨格（T-RE0-005）
 *
 * パイプライン: Diff → Normalize → Classify → Impact → Cluster → Decision
 * 各ステージは PipelineStage インターフェースを実装する。
 * 現時点では骨格のみ。各ステージは E-RE1/RE2/RE3 が実装する。
 */

import type { DiffIR } from './diff-ir';

/** パイプラインの各ステージが実装するインターフェース */
export interface PipelineStage {
  readonly name: string;
  process(ir: DiffIR): DiffIR | Promise<DiffIR>;
}

/** パイプライン実行結果 */
export interface PipelineResult {
  ir: DiffIR;
  /** 各ステージの実行時間（ms） */
  stageDurations: Record<string, number>;
}

/**
 * ReviewPipeline — ステージを順に実行して DiffIR を変換する。
 *
 * 使い方:
 *   const pipeline = new ReviewPipeline([classifyStage, impactStage]);
 *   const result = await pipeline.run(diffIR);
 */
export class ReviewPipeline {
  private readonly stages: PipelineStage[];

  constructor(stages: PipelineStage[] = []) {
    this.stages = stages;
  }

  async run(ir: DiffIR): Promise<PipelineResult> {
    const stageDurations: Record<string, number> = {};
    let current = ir;

    for (const stage of this.stages) {
      const start = Date.now();
      current = await stage.process(current);
      stageDurations[stage.name] = Date.now() - start;
    }

    return { ir: current, stageDurations };
  }

  /** 登録済みステージ名の一覧を返す（テスト・デバッグ用） */
  getStageNames(): string[] {
    return this.stages.map(s => s.name);
  }
}
