/**
 * textui lint — DSL ファイルに対して Rule Pack を実行し Finding を出力する
 *
 * Usage:
 *   textui lint --file <path> [--format json|markdown] [--fail-on-error]
 */

import * as fs from 'fs';
import * as YAML from 'yaml';
import type { ExitCode } from '../types';
import { getArg, hasFlag, printJson } from '../command-support';
import type { TextUIDSL } from '../../domain/dsl-types';
import { runRules, a11yButtonLabel } from '../../integrations/rule-pack';
import type { Finding } from '../../integrations/rule-pack';

// デフォルトで有効な Rule 一覧
const DEFAULT_RULES = [a11yButtonLabel];

type LintFormat = 'json' | 'markdown' | 'plain';

function parseLintFormat(): LintFormat {
  const raw = (getArg('--format') ?? 'plain').toLowerCase();
  if (raw === 'json' || raw === 'markdown' || raw === 'plain') { return raw; }
  throw new Error(`invalid --format value: ${raw}. expected: json|markdown|plain`);
}

function formatFindingsMarkdown(findings: Finding[], filePath: string): string {
  const lines: string[] = [
    `## TextUI Lint: \`${filePath}\``,
    '',
    `Found **${findings.length}** finding(s)`,
    '',
  ];

  if (findings.length === 0) {
    lines.push('✅ No issues found.');
    return lines.join('\n') + '\n';
  }

  lines.push('| Severity | Rule | Path | Message |');
  lines.push('|----------|------|------|---------|');
  for (const f of findings) {
    const hint = f.fixHint ? ` (hint: ${f.fixHint})` : '';
    lines.push(`| ${f.severity} | ${f.ruleId} | \`${f.entityPath}\` | ${f.message}${hint} |`);
  }

  return lines.join('\n') + '\n';
}

function formatFindingsPlain(findings: Finding[], filePath: string): string {
  if (findings.length === 0) {
    return `${filePath}: no issues found\n`;
  }
  return findings
    .map(f => `${filePath}:${f.entityPath} [${f.severity}] ${f.ruleId}: ${f.message}`)
    .join('\n') + '\n';
}

export async function handleLintCommand(): Promise<ExitCode> {
  const filePath = getArg('--file');
  if (!filePath) {
    process.stderr.write('lint requires --file <path>\n');
    return 1;
  }

  const format = parseLintFormat();
  const failOnError = hasFlag('--fail-on-error');

  // DSL ファイルを読み込む
  let dsl: TextUIDSL;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    dsl = YAML.parse(raw) as TextUIDSL;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`lint: failed to read ${filePath}: ${msg}\n`);
    return 1;
  }

  // Rule を実行
  const findings = runRules(dsl, DEFAULT_RULES, { context: { filePath } });

  // 出力
  if (format === 'json') {
    printJson(findings);
  } else if (format === 'markdown') {
    process.stdout.write(formatFindingsMarkdown(findings, filePath));
  } else {
    process.stdout.write(formatFindingsPlain(findings, filePath));
  }

  // --fail-on-error: error severity があれば exit 1
  if (failOnError && findings.some(f => f.severity === 'error')) {
    process.stderr.write(`\nFAIL: ${findings.filter(f => f.severity === 'error').length} error(s) found.\n`);
    return 1;
  }

  return 0;
}
