import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigManager } from '../../utils/config-manager';
import { YamlParser } from '../webview/yaml-parser';
import { OverlayDiffLifecycleManager } from '../webview/overlay-diff-lifecycle-manager';
import { setupOverlayDiffMessageHandler } from '../webview/overlay-diff-message-handler';
import type { TextUIDSL } from '../../domain/dsl-types';

type LoggerLike = {
  debug: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
};

/**
 * Overlay Diff パネルを開くコマンドの実装。
 *
 * 1. アクティブエディタの .tui.yml を DSL A として解決
 * 2. ファイルダイアログで DSL B を選択
 * 3. 両ファイルを並列パース
 * 4. Overlay Diff パネルを作成して init メッセージを登録
 */
export async function executeOpenOverlayDiffCommand(
  context: vscode.ExtensionContext,
  logger: LoggerLike
): Promise<void> {
  logger.debug('openOverlayDiff が呼び出されました');

  // DSL A: アクティブエディタから解決
  const fileNameA = resolveActiveTuiPath();
  if (!fileNameA) {
    vscode.window.showWarningMessage(
      'DSL A の .tui.yml ファイルが見つかりません。先に .tui.yml ファイルを開いてください。'
    );
    return;
  }

  // DSL B: ファイルダイアログで選択
  const pickedUris = await vscode.window.showOpenDialog({
    canSelectMany: false,
    openLabel: 'DSL B として選択',
    filters: { 'TextUI DSL': ['yml', 'yaml'] },
    title: 'Overlay Diff: 比較対象の DSL B を選択'
  });

  if (!pickedUris || pickedUris.length === 0) {
    return;
  }

  const fileNameB = pickedUris[0].fsPath;
  if (!ConfigManager.isSupportedFile(fileNameB)) {
    vscode.window.showErrorMessage(
      `選択されたファイル "${path.basename(fileNameB)}" は .tui.yml ではありません。`
    );
    return;
  }

  if (fileNameA === fileNameB) {
    vscode.window.showWarningMessage(
      'DSL A と DSL B に同じファイルが選択されています。別のファイルを選択してください。'
    );
    return;
  }

  // 並列パース
  let dslA: TextUIDSL;
  let dslB: TextUIDSL;

  try {
    const parserA = new YamlParser();
    const parserB = new YamlParser();
    const [resultA, resultB] = await Promise.all([
      parserA.parseYamlFile(fileNameA),
      parserB.parseYamlFile(fileNameB)
    ]);
    dslA = resultA.data as TextUIDSL;
    dslB = resultB.data as TextUIDSL;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Overlay Diff パース失敗:', error);
    vscode.window.showErrorMessage(`DSL のパースに失敗しました: ${msg}`);
    return;
  }

  // パネル作成
  const lifecycleManager = new OverlayDiffLifecycleManager(context);
  await lifecycleManager.getOrCreatePanel();

  // webview-ready 受信後に overlay-diff-init を送信
  setupOverlayDiffMessageHandler(
    lifecycleManager,
    dslA,
    fileNameA,
    dslB,
    fileNameB,
    context
  );

  logger.debug('Overlay Diff パネルを開きました');
}

function resolveActiveTuiPath(): string | undefined {
  const activeFile = vscode.window.activeTextEditor?.document.fileName;
  if (activeFile && ConfigManager.isSupportedFile(activeFile)) {
    return activeFile;
  }
  return undefined;
}
