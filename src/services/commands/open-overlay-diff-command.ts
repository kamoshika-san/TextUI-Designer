import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigManager } from '../../utils/config-manager';
import { YamlParser } from '../webview/yaml-parser';
import { OverlayDiffLifecycleManager } from '../webview/overlay-diff-lifecycle-manager';
import { setupOverlayDiffMessageHandler } from '../webview/overlay-diff-message-handler';
import type { TextUIDSL } from '../../domain/dsl-types';
import { normalize } from '../../core/diff-normalization/normalize';
import { STAGE2_DEFAULT_ALLOWED_RULES } from '../../core/diff-normalization/stage2-value';
import {
  createNormalizedDiffDocument,
  createDiffResultSkeleton,
} from '../../core/textui-core-diff';
import { classifyReviewImpact } from '../../core/textui-diff-review-impact';
import { buildSemanticSummary } from '../../core/textui-semantic-diff-summary';
import type { SemanticSummaryResult } from '../../core/textui-semantic-diff-summary';

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
 * 4. D4 セマンティック差分要約を計算（失敗しても続行）
 * 5. Overlay Diff パネルを作成して init メッセージを登録
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

  // D4: セマンティック差分要約を計算（失敗してもパネルは開く）
  const semanticSummary = computeSemanticSummary(dslA, fileNameA, dslB, fileNameB, logger);

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
    context,
    semanticSummary ?? undefined
  );

  logger.debug('Overlay Diff パネルを開きました');
}

/**
 * 両 DSL から D4 セマンティック差分要約を計算する。
 *
 * エンジンの二重バリデーションを迂回し、正規化パイプラインと
 * コア差分関数を直接呼び出すことで、パース済み DSL から
 * 直接セマンティック要約を生成する。
 *
 * 失敗した場合は null を返し、呼び出し元はパネルを要約なしで開く。
 */
function computeSemanticSummary(
  dslA: TextUIDSL,
  fileNameA: string,
  dslB: TextUIDSL,
  fileNameB: string,
  logger: LoggerLike
): SemanticSummaryResult | null {
  try {
    // 正規化（失敗時は元の DSL をそのまま使用）
    // stage1-sort-children-by-type-index を除外: type ソートで変わる normalized インデックスが
    // webview に送る original DSL のインデックスとずれ、キャンバスハイライトが狂うため。
    const overlayDiffAllowedRules = [
      'stage1-sort-children-by-token',
      ...STAGE2_DEFAULT_ALLOWED_RULES,
    ];
    const prevNorm = normalize(dslA, { allowedRules: overlayDiffAllowedRules });
    const nextNorm = normalize(dslB, { allowedRules: overlayDiffAllowedRules });
    const prevDsl = prevNorm.ok ? prevNorm.dsl : dslA;
    const nextDsl = nextNorm.ok ? nextNorm.dsl : dslB;

    if (!prevNorm.ok) {
      logger.debug('Overlay Diff: DSL A の正規化に失敗（フォールバック継続）:', prevNorm.message);
    }
    if (!nextNorm.ok) {
      logger.debug('Overlay Diff: DSL B の正規化に失敗（フォールバック継続）:', nextNorm.message);
    }

    // 差分ドキュメント + スケルトン生成
    const previous = createNormalizedDiffDocument(prevDsl, {
      side: 'previous',
      sourcePath: fileNameA,
    });
    const next = createNormalizedDiffDocument(nextDsl, {
      side: 'next',
      sourcePath: fileNameB,
    });
    const compareResult = createDiffResultSkeleton(previous, next);

    // D2-1 + D4
    const reviewImpact = classifyReviewImpact(compareResult);
    const summary = buildSemanticSummary(compareResult, reviewImpact);

    logger.debug(`Overlay Diff: セマンティック要約を生成しました (${summary.lines.length} 件)`);
    return summary;
  } catch (err) {
    logger.error('Overlay Diff: セマンティック要約計算中に予期しないエラー:', err);
    return null;
  }
}

function resolveActiveTuiPath(): string | undefined {
  const activeFile = vscode.window.activeTextEditor?.document.fileName;
  if (activeFile && ConfigManager.isSupportedFile(activeFile)) {
    return activeFile;
  }
  return undefined;
}
