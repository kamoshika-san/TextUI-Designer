/**
 * WebView プレビュー更新パイプラインの明示的フェーズ。
 * キュー（UpdateQueueManager）・デバウンスは別レイヤ。ここでは「1 回の sendYamlToWebview 相当」の遷移を表す。
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
 * プレビュー更新のフェーズ遷移を一箇所で追跡する（暗黙の lastTuiFile / isUpdating とは独立した観測用）。
 */
export class PreviewUpdateCoordinator {
  private phase: PreviewUpdatePhase = PreviewUpdatePhase.Idle;

  getPhase(): PreviewUpdatePhase {
    return this.phase;
  }

  /** パイプライン開始（sendYamlToWebview がロックを取った直後） */
  beginPipeline(): void {
    this.phase = PreviewUpdatePhase.Scheduled;
  }

  setPhase(phase: PreviewUpdatePhase): void {
    this.phase = phase;
  }

  /** 正常・異常を問わずパイプライン終端 */
  endPipeline(): void {
    this.phase = PreviewUpdatePhase.Idle;
  }

  markFailed(): void {
    this.phase = PreviewUpdatePhase.Failed;
  }
}
