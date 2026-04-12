/**
 * Review Engine CLI コマンド群（T-RE0-007〜009 / T-RE1-015〜016）
 *
 * textui review          — DiffIR を出力（--format json|markdown）
 * textui review:impact   — Impact フィールドを含む DiffIR を出力
 * textui review:decide   — Decision 入力を受け付ける（E-RE1 実装後に充実）
 * textui review:check    — 未決定 Diff を検出する Decision Gate
 *
 * VCS 統合: VcsConnector インターフェース経由（デフォルト: NullConnector）
 * プラットフォーム固有実装は src/integrations/<platform>/ に独立配置。
 */

import type { ExitCode } from '../types';
import { getArg, hasFlag, printJson } from '../command-support';
import { runSemanticDiffCompare, renderSemanticDiffHumanReadable } from '../../services/semantic-diff/git-semantic-diff';
import { toExternalDiffResult } from '../../services/semantic-diff/diff-result-external-adapter';
import { semanticDiffToDiffIR, DecisionJsonStore } from '../../domain/review-engine';
import type { VcsConnector } from '../../integrations/vcs-connector';
import { NullConnector } from '../../integrations/null-connector';

// デフォルトコネクタ（プラットフォーム非依存）
// 将来: 環境変数や設定ファイルで GitHubConnector 等に差し替え可能
let _connector: VcsConnector = new NullConnector();

/** テスト・外部設定からコネクタを注入する */
export function setVcsConnector(connector: VcsConnector): void {
  _connector = connector;
}

export function getVcsConnector(): VcsConnector {
  return _connector;
}

type OutputFormat = 'json' | 'markdown';

function parseFormat(): OutputFormat {
  const raw = (getArg('--format') ?? 'json').toLowerCase();
  if (raw === 'json' || raw === 'markdown') { return raw; }
  throw new Error(`invalid --format value: ${raw}. expected: json|markdown`);
}

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
 * オプション: --format json|markdown（デフォルト: json）
 *            --include-decisions: decisions フィールドを DiffResultExternal に含める
 */
export async function handleReviewCommand(): Promise<ExitCode> {
  const format = parseFormat();
  const baseRef = requireArg('--base');
  const headRef = requireArg('--head');
  const filePath = requireArg('--file');
  const includeDecisions = hasFlag('--include-decisions');

  const compareResult = runSemanticDiffCompare({ baseRef, headRef, filePath });

  if (format === 'markdown') {
    const md = renderSemanticDiffHumanReadable(compareResult);
    process.stdout.write(md);
    return 0;
  }

  // JSON: DiffResultExternal スキーマで出力
  let decisions;
  if (includeDecisions) {
    const repoRoot = process.cwd();
    const store = new DecisionJsonStore(repoRoot, filePath);
    await store.load();
    decisions = store.list();
  }

  const external = toExternalDiffResult(compareResult, decisions);
  printJson(external);
  return 0;
}

/**
 * textui review:impact
 * 現時点では review と同じ出力。E-RE2 完了後に Impact フィールドが充実する。
 */
export async function handleReviewImpactCommand(): Promise<ExitCode> {
  const format = parseFormat();
  const baseRef = requireArg('--base');
  const headRef = requireArg('--head');
  const filePath = requireArg('--file');

  const compareResult = runSemanticDiffCompare({ baseRef, headRef, filePath });

  if (format === 'markdown') {
    const md = renderSemanticDiffHumanReadable(compareResult);
    process.stdout.write(md);
    return 0;
  }

  const external = toExternalDiffResult(compareResult);
  printJson(external);
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
 * オプション: --format json|markdown（デフォルト: json）
 *
 * 1. --base / --head / --file から DiffIR を生成して changeId 一覧を取得
 * 2. .textui/decisions/<key>.json をロードして Decision 済み changeId を確認
 * 3. 未決定 changeId を stdout に出力
 * 4. --fail-on-undecided 指定時: 未決定あり → exit 1、なし → exit 0
 */
export async function handleReviewCheckCommand(): Promise<ExitCode> {
  const failOnUndecided = hasFlag('--fail-on-undecided');
  const format = parseFormat();
  const filePath = getArg('--file');

  if (!filePath) {
    process.stderr.write('review:check requires --file <path>\n');
    return 1;
  }

  const baseRef = getArg('--base') ?? 'HEAD~1';
  const headRef = getArg('--head') ?? 'HEAD';

  let changeIds: string[];
  try {
    const compareResult = runSemanticDiffCompare({ baseRef, headRef, filePath });
    const diffIR = semanticDiffToDiffIR(compareResult.diff);
    changeIds = diffIR.changes.map(c => c.changeId);
  } catch {
    changeIds = [];
  }

  const repoRoot = process.cwd();
  const store = new DecisionJsonStore(repoRoot, filePath);
  await store.load();

  const undecided = changeIds.filter(id => !store.get(id));
  const decided   = changeIds.filter(id =>  store.get(id));

  if (format === 'markdown') {
    // Markdown 形式（CI パイプラインが受け取って任意の方法で投稿する）
    const lines: string[] = [
      `## TextUI Review Check: \`${filePath}\``,
      '',
      `| | Count |`,
      `|---|---|`,
      `| Total changes | ${changeIds.length} |`,
      `| Decided | ${decided.length} |`,
      `| **Undecided** | **${undecided.length}** |`,
      '',
    ];
    if (undecided.length > 0) {
      lines.push('### Undecided Changes');
      for (const id of undecided) {
        lines.push(`- \`${id}\``);
      }
      lines.push('');
    }
    if (failOnUndecided && undecided.length > 0) {
      lines.push(`> ⚠️ **FAIL**: ${undecided.length} undecided change(s). Use \`textui review:decide\` to resolve.`);
    } else if (undecided.length === 0) {
      lines.push('> ✅ All changes have been decided.');
    }
    process.stdout.write(lines.join('\n') + '\n');
  } else {
    // JSON / plain 形式（既存動作を維持）
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
  }

  if (failOnUndecided && undecided.length > 0) {
    process.stderr.write(`\nFAIL: ${undecided.length} undecided change(s). Use textui review:decide to resolve.\n`);
    return 1;
  }

  return 0;
}
