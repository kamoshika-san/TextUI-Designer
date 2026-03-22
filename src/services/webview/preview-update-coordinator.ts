import { logPreviewPipelinePhaseSummary } from './preview-pipeline-observability';

/**
 * WebView プレビュー更新パイプラインの明示的フェーズ。
 * キュー（UpdateQueueManager）・デバウンスは別レイヤ。ここでは「1 回の sendYamlToWebview 相当」の遷移を表す。
 *
 * **観測専用の列挙**（T-208）: フェーズ値を **業務判断・分岐・再入制御の唯一の根拠**にしないこと。
 * 制御ロジックは `PreviewUpdateSessionState`・キュー・`WebViewUpdateManager` の契約に従う。
 */
export enum PreviewUpdatePhase {
  /** パイプライン外 */
  Idle = 'idle',
  /** 更新タスクが実行に入った直後（キューから execute 開始〜本処理突入） */
  Scheduled = 'scheduled',
  /** キャッシュ判定用に現在の YAML ソースを解決中 */
  ResolvingSource = 'resolving_source',
  /** メモリキャッシュのヒット可否を確認中 */
  CacheLookup = 'cache_lookup',
  /** YamlParser.parseYamlFile（パース・include 解決・スキーマ検証を内包） */
  Parsing = 'parsing',
  /** パース完了後、配信直前（スキーマ検証は Parsing 内で完了済み） */
  Validating = 'validating',
  /** WebView へ postMessage */
  Delivering = 'delivering',
  /** エラーハンドリング対象（直後に Idle に戻る） */
  Failed = 'failed'
}

/**
 * プレビュー更新のフェーズ遷移を一箇所で追跡する（暗黙の lastTuiFile / isUpdating とは独立）。
 *
 * @remarks
 * **観測（telemetry）と制御（control）の境界**（E5-S2-T2 / T-208）:
 * - 本クラスは **1 回の `sendYamlToWebview` 内**の進行状況を表す **観測用** の状態機械である。
 * - **キュー滞留・優先度・キャンセル・再入可否**などの **制御**は `UpdateQueueManager` および
 *   `PreviewUpdateSessionState` / `shouldBlockYamlSend` 等が担う。フェーズを読んで「送る／送らない」を
 *   追加の入口で決めないこと（誤用防止）。
 * - 将来メトリクスやログに出す用途を想定。外部 API として公開する場合も **読み取り専用のテレメトリ**として扱う。
 */
export class PreviewUpdateCoordinator {
  private phase: PreviewUpdatePhase = PreviewUpdatePhase.Idle;
  /** `beginPipeline` 以降の 1 ランの計測（T-304） */
  private pipelineStartMs = 0;
  private segmentStartMs = 0;
  private phaseDurationsMs: Record<string, number> = {};

  /** 現在フェーズ（観測用。制御判断の単一ソースにしない） */
  getPhase(): PreviewUpdatePhase {
    return this.phase;
  }

  /** パイプライン開始（sendYamlToWebview がロックを取った直後） */
  beginPipeline(): void {
    this.phase = PreviewUpdatePhase.Scheduled;
    const now = performance.now();
    this.pipelineStartMs = now;
    this.segmentStartMs = now;
    this.phaseDurationsMs = {};
  }

  setPhase(phase: PreviewUpdatePhase): void {
    const now = performance.now();
    this.accumulateSegment(now);
    this.phase = phase;
  }

  /** 正常・異常を問わずパイプライン終端 */
  endPipeline(): void {
    const now = performance.now();
    if (this.pipelineStartMs > 0) {
      this.accumulateSegment(now);
      logPreviewPipelinePhaseSummary(this.phaseDurationsMs, now - this.pipelineStartMs);
    }
    this.phase = PreviewUpdatePhase.Idle;
    this.pipelineStartMs = 0;
    this.phaseDurationsMs = {};
  }

  markFailed(): void {
    const now = performance.now();
    this.accumulateSegment(now);
    this.phase = PreviewUpdatePhase.Failed;
  }

  private accumulateSegment(now: number): void {
    if (this.pipelineStartMs <= 0) {
      return;
    }
    const key = String(this.phase);
    const delta = now - this.segmentStartMs;
    this.phaseDurationsMs[key] = (this.phaseDurationsMs[key] || 0) + delta;
    this.segmentStartMs = now;
  }
}
