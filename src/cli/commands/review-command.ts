/**
 * Review Engine CLI コマンド群（T-RE0-007〜009 / T-RE1-015〜016）
 *
 * textui review          — DiffIR JSON を標準出力に返す
 * textui review:impact   — Impact フィールドを含む DiffIR を出力（E-RE2 実装後に充実）
 * textui review:decide   — Decision 入力を受け付ける（E-RE1 実装後に充実）
 * textui review:check    — 未決定 Diff を検出する Decision Gate
 */

import type { ExitCode } from '../types';
import { getArg, hasFlag, printJson } from '../command-support';
import { runSemanticDiffCompare } from '../../services/semantic-diff/git-semantic-diff';
import { semanticDiffToDiffIR, DecisionJsonStore } from '../../domain/review-engine';

function requireArg(flag: string): string {
  const value = getArg(flag);
  if (!value) {
    throw new Error(`review requires ${flag}`);
  }
  return value;
}

/**
 * textui review
 * 必須: --base <ref> --head <ref> --file <path>
 * オプション: --json（デフォルト true）
 */
export async function handleReviewCommand(): Promise<ExitCode> {
  const baseRef = requireArg('--base');
  const headRef = requireArg('--head');
  const filePath = requireArg('--file');

  const compareResult = runSemanticDiffCompare({ baseRef, headRef, filePath });
  const diffIR = semanticDiffToDiffIR(compareResult.diff);

  printJson(diffIR);
  return 0;
}

/**
 * textui review:impact
 * 現時点では review と同じ出力。E-RE2 完了後に Impact フィールドが充実する。
 */
export async function handleReviewImpactCommand(): Promise<ExitCode> {
  const baseRef = requireArg('--base');
  const headRef = requireArg('--head');
  const filePath = requireArg('--file');

  const compareResult = runSemanticDiffCompare({ baseRef, headRef, filePath });
  const diffIR = semanticDiffToDiffIR(compareResult.diff);

  // E-RE2 実装後: impacts フィールドが付与された DiffIR を出力する
  printJson({ ...diffIR, _note: 'impact analysis not yet implemented (E-RE2)' });
  return 0;
}

/**
 * textui review:decide
 * 現時点では未実装のスタブ。E-RE1-S2/S3 完了後に Decision 入力フローを実装する。
 */
export async function handleReviewDecideCommand(): Promise<ExitCode> {
  process.stdout.write(
    'review:decide is not yet implemented. Requires E-RE1 (Decision UI + Persistence).\n'
  );
  return 1;
}

/**
 * textui review:check [--fail-on-undecided] --base <ref> --head <ref> --file <path>
 * T-RE1-015 / T-RE1-016
 *
 * 1. --base / --head / --file から DiffIR を生成して changeId 一覧を取得
 * 2. .textui/decisions/<key>.json をロードして Decision 済み changeId を確認
 * 3. 未決定 changeId を stdout に出力
 * 4. --fail-on-undecided 指定時: 未決定あり → exit 1、なし → exit 0
 *    未指定時: 常に exit 0（レポートのみ）
 */
export async function handleReviewCheckCommand(): Promise<ExitCode> {
  const failOnUndecided = hasFlag('--fail-on-undecided');
  const filePath = getArg('--file');

  if (!filePath) {
    process.stderr.write('review:check requires --file <path>\n');
    return 1;
  }

  // DiffIR を生成して changeId 一覧を取得
  const baseRef = getArg('--base') ?? 'HEAD~1';
  const headRef = getArg('--head') ?? 'HEAD';

  let changeIds: string[];
  try {
    const compareResult = runSemanticDiffCompare({ baseRef, headRef, filePath });
    const diffIR = semanticDiffToDiffIR(compareResult.diff);
    changeIds = diffIR.changes.map(c => c.changeId);
  } catch {
    // git diff が失敗した場合（ファイルが存在しない等）は空として扱う
    changeIds = [];
  }

  // DecisionJsonStore をロードして決定済み changeId を確認
  const repoRoot = process.cwd();
  const store = new DecisionJsonStore(repoRoot, filePath);
  await store.load();

  const undecided = changeIds.filter(id => !store.get(id));
  const decided   = changeIds.filter(id =>  store.get(id));

  // レポート出力
  process.stdout.write(`review:check ${filePath}\n`);
  process.stdout.write(`  total:     ${changeIds.length}\n`);
  process.stdout.write(`  decided:   ${decided.length}\n`);
  process.stdout.write(`  undecided: ${undecided.length}\n`);

  if (undecided.length > 0) {
    process.stdout.write('  undecided changeIds:\n');
    for (const id of undecided) {
      process.stdout.write(`    - ${id}\n`);
    }
  }

  if (failOnUndecided && undecided.length > 0) {
    process.stderr.write(`\nFAIL: ${undecided.length} undecided change(s). Use textui review:decide to resolve.\n`);
    return 1;
  }

  return 0;
}
