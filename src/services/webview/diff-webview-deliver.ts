/**
 * WebView Diff ペイロード配信（T-F02）
 *
 * VisualDiffResult を postMessage で WebView へ送る配信関数。
 * メッセージ形式: { type: 'diff-update', diff: VisualDiffResult }
 *
 * WebView React 側の受信処理・CSS ハイライトは Slice 3 の責務。
 */

import type { ComponentDef } from '../../domain/dsl-types';
import type { DiffResult } from '../../exporters/metrics/diff-manager';
import type { VisualDiffResult } from '../../domain/diff/visual-diff-model';
import type { WebViewLifecycleManager } from './webview-lifecycle-manager';
import { toVisualDiff } from '../diff/visual-diff-mapper';

export interface DiffUpdateMessage {
  type: 'diff-update';
  diff: VisualDiffResult;
}

/**
 * DiffResult と旧／新コンポーネント配列から VisualDiffResult を生成し、
 * WebView パネルへ `{ type: 'diff-update', diff }` を postMessage する。
 *
 * パネルが存在しない場合は no-op。
 */
export function deliverDiffPayload(
  lifecycleManager: WebViewLifecycleManager,
  diffResult: DiffResult,
  oldComponents: ComponentDef[],
  newComponents: ComponentDef[],
): void {
  const panel = lifecycleManager.getPanel();
  if (!panel) {
    return;
  }

  const diff = toVisualDiff(diffResult, oldComponents, newComponents);

  const message: DiffUpdateMessage = {
    type: 'diff-update',
    diff,
  };

  panel.webview.postMessage(message);
}
