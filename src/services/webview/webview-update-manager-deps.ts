import type { WebViewPreviewCacheManager } from './cache-manager';
import type { PreviewFailurePolicyContext } from './preview-failure-policy';
import type { PreviewPipelineQueueTrace } from './preview-pipeline-observability';

/**
 * Preview 更新キュー（{@link WebViewUpdateManager} が使用する最小表面）。
 * テストでは本インターフェースを満たすモックを注入し、デバウンス・最小間隔を回避できる（T-210）。
 */
export interface IWebViewUpdateQueue {
  queueUpdate(
    updateFunction: () => Promise<void>,
    forceUpdate?: boolean,
    priority?: number,
    trace?: PreviewPipelineQueueTrace
  ): Promise<void>;
  queueUpdateWithDebounce(
    updateFunction: () => Promise<void>,
    debounceDelay?: number,
    trace?: PreviewPipelineQueueTrace
  ): void;
  getQueueStatus(): {
    queueSize: number;
    isProcessing: boolean;
    lastUpdateTime: number;
  };
  dispose(): void;
}

export type PreviewFailurePolicyApplyFn = (error: unknown, ctx: PreviewFailurePolicyContext) => void;

/**
 * {@link WebViewUpdateManager} へ注入可能な依存（ユニットテストの差し替え用・T-210）。
 * 省略時は従来どおり内部でインスタンス生成 / `applyPreviewFailurePolicy` を使用。
 */
export type WebViewUpdateManagerDeps = {
  /** 更新キュー（省略時は {@link UpdateQueueManager}） */
  updateQueueManager?: IWebViewUpdateQueue;
  /** プレビュー YAML キャッシュ（省略時は {@link WebViewPreviewCacheManager}） */
  cacheManager?: WebViewPreviewCacheManager;
  /** パイプライン失敗時のポリシー（省略時は `applyPreviewFailurePolicy`） */
  applyFailurePolicy?: PreviewFailurePolicyApplyFn;
};
