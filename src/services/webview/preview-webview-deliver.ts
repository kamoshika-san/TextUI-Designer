import * as vscode from 'vscode';
import * as path from 'path';
import type { WebViewLifecycleManager } from './webview-lifecycle-manager';
import { resolveImageSourcesInDsl } from '../../utils/image-source-resolver';
import { logPreviewDelivered } from './preview-pipeline-observability';

/**
 * プレビュー WebView へ DSL ペイロードを postMessage する（deliver ポート）。
 * `WebViewUpdateManager` から切り出し、オーケストレーションと配信を分離する（T-077）。
 */
export function deliverPreviewPayload(
  lifecycleManager: WebViewLifecycleManager,
  data: unknown,
  fileName: string
): void {
  const panel = lifecycleManager.getPanel();
  if (!panel) {
    return;
  }

  const normalizedData = resolveImageSourcesInDsl(data, {
    dslFileDir: path.dirname(fileName),
    mapResolvedSrc: absolutePath => panel.webview.asWebviewUri(vscode.Uri.file(absolutePath)).toString()
  });

  panel.webview.postMessage({
    type: 'update',
    data: normalizedData,
    fileName: fileName
  });

  logPreviewDelivered(fileName);
}
