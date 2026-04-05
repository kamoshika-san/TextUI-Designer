import * as vscode from 'vscode';
import * as path from 'path';
import type { OverlayDiffLifecycleManager } from './overlay-diff-lifecycle-manager';
import type { TextUIDSL } from '../../domain/dsl-types';
import { resolveImageSourcesInDsl } from '../../utils/image-source-resolver';

/**
 * Overlay Diff パネルの webview-ready 受信後に
 * overlay-diff-init メッセージを送信する。
 */
export function setupOverlayDiffMessageHandler(
  lifecycleManager: OverlayDiffLifecycleManager,
  dslA: TextUIDSL,
  fileNameA: string,
  dslB: TextUIDSL,
  fileNameB: string,
  context: vscode.ExtensionContext
): void {
  const panel = lifecycleManager.getPanel();
  if (!panel) {
    return;
  }

  let hasSentInit = false;

  panel.webview.onDidReceiveMessage(
    async (message: unknown) => {
      if (
        typeof message === 'object' &&
        message !== null &&
        (message as Record<string, unknown>).type === 'webview-ready' &&
        !hasSentInit
      ) {
        console.log('[Extension] Received webview-ready, sending overlay-diff-init');
        sendOverlayDiffInit(panel, dslA, fileNameA, dslB, fileNameB);
        hasSentInit = true;
      }
    },
    undefined,
    context.subscriptions
  );
}

function sendOverlayDiffInit(
  panel: { webview: { postMessage: (msg: unknown) => void; asWebviewUri: (uri: vscode.Uri) => vscode.Uri } },
  dslA: TextUIDSL,
  fileNameA: string,
  dslB: TextUIDSL,
  fileNameB: string
): void {
  console.log('[Extension] Sending overlay-diff-init message');
  const resolvedDslA = resolveImageSourcesInDsl(dslA, {
    dslFileDir: path.dirname(fileNameA),
    mapResolvedSrc: (absolutePath: string) =>
      panel.webview.asWebviewUri(vscode.Uri.file(absolutePath)).toString()
  });

  const resolvedDslB = resolveImageSourcesInDsl(dslB, {
    dslFileDir: path.dirname(fileNameB),
    mapResolvedSrc: (absolutePath: string) =>
      panel.webview.asWebviewUri(vscode.Uri.file(absolutePath)).toString()
  });

  panel.webview.postMessage({
    type: 'overlay-diff-init',
    dslA: resolvedDslA,
    fileNameA,
    dslB: resolvedDslB,
    fileNameB
  });
}
