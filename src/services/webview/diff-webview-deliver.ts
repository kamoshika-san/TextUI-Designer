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
import type { VisualDiffV2Result } from '../../domain/diff/semantic-diff-v2-panel-model';
import type { WebViewLifecycleManager } from './webview-lifecycle-manager';
import { toVisualDiff } from '../diff/visual-diff-mapper';

export interface DiffUpdateMessage {
  type: 'diff-update';
  diff: VisualDiffResult;
}

/** Wave 0 §3.2 — Extension → WebView semantic v2 パネル */
export interface DiffUpdateV2Message {
  type: 'diff-update-v2';
  schemaVersion: 1;
  payload: VisualDiffV2Result['payload'];
}

export function buildDiffUpdateV2PostMessage(result: VisualDiffV2Result): DiffUpdateV2Message {
  return {
    type: 'diff-update-v2',
    schemaVersion: 1,
    payload: result.payload,
  };
}

/**
 * `VisualDiffV2Result` を `{ type: 'diff-update-v2', ... }` で WebView に送る。
 * パネルが無い場合は no-op。既存 `deliverDiffPayload` は変更しない。
 */
export function deliverSemanticDiffV2Panel(
  lifecycleManager: WebViewLifecycleManager,
  result: VisualDiffV2Result,
): void {
  const panel = lifecycleManager.getPanel();
  if (!panel) {
    return;
  }
  panel.webview.postMessage(buildDiffUpdateV2PostMessage(result));
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
