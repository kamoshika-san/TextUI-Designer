/**
 * WebView 競合ペイロード配信（T-I05）
 *
 * ConflictResult を postMessage で WebView へ送る配信関数。
 * メッセージ形式: { type: 'conflict-update', conflict: ConflictViewResult }
 *
 * WebView React 側の受信処理は use-webview-messages.ts の 'conflict-update' ハンドラが担う。
 */

import type { ConflictResult } from '../../domain/diff/conflict-detector';
import type { ConflictViewResult } from '../../domain/diff/conflict-webview-model';
import type { WebViewLifecycleManager } from '../webview/webview-lifecycle-manager';
import { toConflictView } from './conflict-view-mapper';

export interface ConflictUpdateMessage {
  type: 'conflict-update';
  conflict: ConflictViewResult;
}

/**
 * ConflictResult から ConflictViewResult を生成し、
 * WebView パネルへ `{ type: 'conflict-update', conflict }` を postMessage する。
 *
 * パネルが存在しない場合は no-op。
 */
export function deliverConflictPayload(
  lifecycleManager: WebViewLifecycleManager,
  conflictResult: ConflictResult,
): void {
  const panel = lifecycleManager.getPanel();
  if (!panel) {
    return;
  }

  const conflict = toConflictView(conflictResult);

  const message: ConflictUpdateMessage = {
    type: 'conflict-update',
    conflict,
  };

  panel.webview.postMessage(message);
}
