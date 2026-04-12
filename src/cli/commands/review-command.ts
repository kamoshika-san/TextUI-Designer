/**
 * Review Engine CLI コマンド群（T-RE0-007〜009）
 *
 * textui review          — DiffIR JSON を標準出力に返す
 * textui review:impact   — Impact フィールドを含む DiffIR を出力（E-RE2 実装後に充実）
 * textui review:decide   — Decision 入力を受け付ける（E-RE1 実装後に充実）
 * textui review:check    — 未決定 Diff を検出する（E-RE1-S5 実装後に充実）
 */

import type { ExitCode } from '../types';
import { getArg, hasFlag, printJson } from '../command-support';
import { runSemanticDiffCompare } from '../../services/semantic-diff/git-semantic-diff';
import { semanticDiffToDiffIR } from '../../domain/review-engine';

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
 * textui review:check [--fail-on-undecided]
 * 現時点では未実装のスタブ。E-RE1-S5 完了後に Decision Gate を実装する。
 */
export async function handleReviewCheckCommand(): Promise<ExitCode> {
  const failOnUndecided = hasFlag('--fail-on-undecided');

  process.stdout.write(
    'review:check is not yet implemented. Requires E-RE1-S5 (Decision Gate).\n'
  );

  // --fail-on-undecided が指定されている場合は非ゼロ終了（スタブ段階では常に未決定扱い）
  return failOnUndecided ? 1 : 0;
}
