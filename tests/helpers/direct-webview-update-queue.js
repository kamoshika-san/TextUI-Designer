'use strict';

/**
 * {@link WebViewUpdateManager} 向けテスト用キュー（T-210）。
 * デバウンス・最小更新間隔を使わず即時実行し、timing 依存の `setTimeout` 待ちを不要にする。
 * 本番の {@link UpdateQueueManager} の代わりに `deps.updateQueueManager` へ渡す。
 */
class DirectWebViewUpdateQueueForTest {
  async queueUpdate(updateFunction, _forceUpdate, _priority, trace) {
    if (trace) {
      const { withPreviewPipelineTrace } = require('../../out/services/webview/preview-pipeline-observability');
      await withPreviewPipelineTrace(trace, () => updateFunction());
      return;
    }
    await updateFunction();
  }

  queueUpdateWithDebounce(updateFunction, _debounceDelay, trace) {
    void this.queueUpdate(updateFunction, false, 0, trace);
  }

  getQueueStatus() {
    return { queueSize: 0, isProcessing: false, lastUpdateTime: -1 };
  }

  dispose() {}
}

module.exports = { DirectWebViewUpdateQueueForTest };
