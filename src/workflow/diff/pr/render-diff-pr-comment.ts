/**
 * renderDiffPRComment: render a DiffPRCommentPayload to a Markdown string.
 *
 * Purpose (T-20260401-006, Epic L Sprint L2):
 *   Render a DiffPRCommentPayload produced by buildDiffPRCommentPayload() into
 *   a GitHub-compatible Markdown string. Two rendering modes are supported:
 *
 *   compact:
 *     Signal badge + total event count + top N findings from payload.highlights.
 *     Suitable for inline PR status checks and quick-scan reviews.
 *
 *   full:
 *     Full narrative groups (from payload.narrative) + finding table +
 *     evidence links. Suitable for detailed review comments.
 *
 * Design rules:
 *   - Markdown only. No HTML tags in output (GitHub-safe).
 *   - Deterministic: identical payload + opts → identical output string.
 *   - No re-judgment: render only what is in the payload. Never re-classify events.
 *   - maxChars: when set and output exceeds limit, truncate findings (reduce count
 *     from the end) until it fits, then append a truncation notice.
 */

import type { DiffPRCommentPayload, DiffPRCommentFinding } from './build-diff-pr-comment-payload';
import type { DiffSummarySeverity } from '../../../core/textui-diff-review-impact';
import type { DiffNarrativeGroup } from '../../../core/textui-diff-summary-narrative';
import type { SemanticSummaryLine } from '../../../core/textui-semantic-diff-summary';

// -- Options -----------------------------------------------------------------

export interface RenderDiffPRCommentOpts {
  mode: 'compact' | 'full';
  /** Maximum character count for the output. Truncation applied if exceeded. */
  maxChars?: number;
}

// -- Internal constants ------------------------------------------------------

const SIGNAL_BADGE: Record<string, string> = {
  pass: '✅ PASS',
  warn: '⚠️ WARN',
  fail: '❌ FAIL',
};

const SEVERITY_LABEL: Record<DiffSummarySeverity, string> = {
  's3-critical': 'critical',
  's2-review':   'review',
  's1-notice':   'notice',
  's0-minor':    'minor',
};

const TRUNCATION_NOTICE = '\n\n<!-- output truncated to fit maxChars limit -->';

// -- Internal helpers --------------------------------------------------------

function signalBadge(signal: string): string {
  return SIGNAL_BADGE[signal] ?? signal.toUpperCase();
}

function severityLabel(severity: DiffSummarySeverity): string {
  return SEVERITY_LABEL[severity] ?? severity;
}

function renderFindingRow(f: DiffPRCommentFinding): string {
  return `| ${f.eventId} | ${f.kind} | ${f.entityKind} | ${severityLabel(f.severity)} | ${f.description} |`;
}

function renderFindingTable(findings: DiffPRCommentFinding[]): string {
  if (findings.length === 0) {
    return '_No findings._';
  }
  const header = '| Event ID | Kind | Entity | Severity | Description |';
  const separator = '|----------|------|--------|----------|-------------|';
  const rows = findings.map(renderFindingRow);
  return [header, separator, ...rows].join('\n');
}

function renderNarrativeGroup(group: DiffNarrativeGroup): string {
  return `**${group.axis}** (${group.highestSeverity}): ${group.narrative}`;
}

function renderLinks(links: Array<{ label: string; href: string }>): string {
  return links.map(l => `- [${l.label}](${l.href})`).join('\n');
}

function renderSemanticLine(line: SemanticSummaryLine): string {
  return `${line.prefix} ${line.text}`;
}

/**
 * Render the D4 semantic summary block.
 *
 * Lines are sorted: additions first (+), then updates (~), then removals (-),
 * then ambiguous (?), with severity descending within each group.
 * This ordering lets reviewers scan additions and critical updates first.
 */
function renderSemanticSummaryBlock(lines: SemanticSummaryLine[]): string {
  const PREFIX_ORDER: Record<string, number> = { '+': 0, '~': 1, '-': 2, '?': 3 };
  const SEVERITY_RANK: Record<DiffSummarySeverity, number> = {
    's3-critical': 3, 's2-review': 2, 's1-notice': 1, 's0-minor': 0,
  };

  const sorted = [...lines].sort((a, b) => {
    const prefixDiff = (PREFIX_ORDER[a.prefix] ?? 9) - (PREFIX_ORDER[b.prefix] ?? 9);
    if (prefixDiff !== 0) { return prefixDiff; }
    return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
  });

  return sorted.map(renderSemanticLine).join('\n');
}

// -- Compact mode renderer ---------------------------------------------------

function renderCompact(payload: DiffPRCommentPayload): string {
  const { header, highlights, semanticSummary } = payload;
  const badge = signalBadge(header.signal);

  const lines: string[] = [];
  lines.push(`## Diff Check: ${badge}`);
  lines.push('');
  lines.push(`**Events:** ${header.totalEvents} total` +
    (header.criticalCount > 0 ? ` — **${header.criticalCount} critical**` : '') +
    (header.highestSeverity ? ` — highest: \`${severityLabel(header.highestSeverity)}\`` : ''));

  // D4: semantic summary (compact shows all lines — scannable before detail table)
  if (semanticSummary && semanticSummary.lines.length > 0) {
    lines.push('');
    lines.push('### 変更サマリー');
    lines.push('');
    lines.push('```');
    lines.push(renderSemanticSummaryBlock(semanticSummary.lines));
    lines.push('```');
  }

  if (highlights.length > 0) {
    lines.push('');
    lines.push(`### Top Findings (${highlights.length})`);
    lines.push('');
    lines.push(renderFindingTable(highlights));
  } else {
    lines.push('');
    lines.push('_No findings._');
  }

  return lines.join('\n');
}

// -- Full mode renderer -------------------------------------------------------

function renderFull(payload: DiffPRCommentPayload): string {
  const { header, findings, narrative, semanticSummary, links } = payload;
  const badge = signalBadge(header.signal);

  const lines: string[] = [];
  lines.push(`## Diff Check Report: ${badge}`);
  lines.push('');
  lines.push(`**Events:** ${header.totalEvents} total` +
    (header.criticalCount > 0 ? ` — **${header.criticalCount} critical**` : '') +
    (header.highestSeverity ? ` — highest: \`${severityLabel(header.highestSeverity)}\`` : ''));

  // D4: semantic summary — shown first so reviewers see "what changed" before detail
  if (semanticSummary && semanticSummary.lines.length > 0) {
    lines.push('');
    lines.push('### 変更サマリー');
    lines.push('');
    lines.push('```');
    lines.push(renderSemanticSummaryBlock(semanticSummary.lines));
    lines.push('```');
  }

  // Narrative groups (D2-3 output, verbatim)
  if (narrative.groups.length > 0) {
    lines.push('');
    lines.push('### Narrative Summary');
    lines.push('');
    for (const group of narrative.groups) {
      lines.push(renderNarrativeGroup(group));
    }
  }

  // Full finding table
  lines.push('');
  lines.push(`### All Findings (${findings.length})`);
  lines.push('');
  lines.push(renderFindingTable(findings));

  // Evidence links (optional)
  if (links && links.length > 0) {
    lines.push('');
    lines.push('### Evidence Links');
    lines.push('');
    lines.push(renderLinks(links));
  }

  return lines.join('\n');
}

// -- Truncation --------------------------------------------------------------

/**
 * Truncate output to fit within maxChars by progressively reducing findings
 * from the end of the finding table.
 *
 * Strategy:
 *   1. If output fits, return as-is.
 *   2. Otherwise, re-render with fewer findings until it fits or findings = 0.
 *   3. Append truncation notice (which itself is counted in the limit).
 *   4. If even zero findings + notice exceeds limit, hard-truncate the string.
 */
function truncateToMaxChars(
  payload: DiffPRCommentPayload,
  opts: RenderDiffPRCommentOpts,
  maxChars: number
): string {
  // Try rendering with progressively fewer findings
  const renderFn = opts.mode === 'compact' ? renderCompact : renderFull;

  // For compact, highlights is the findings list; for full, findings is.
  const fullRender = renderFn(payload);
  if (fullRender.length + TRUNCATION_NOTICE.length <= maxChars) {
    return fullRender;
  }

  // Determine which list to truncate
  const findingsList = opts.mode === 'compact'
    ? payload.highlights
    : payload.findings;

  for (let n = findingsList.length - 1; n >= 0; n--) {
    const truncatedPayload: DiffPRCommentPayload = opts.mode === 'compact'
      ? { ...payload, highlights: findingsList.slice(0, n) }
      : { ...payload, findings: findingsList.slice(0, n) };

    const candidate = renderFn(truncatedPayload) + TRUNCATION_NOTICE;
    if (candidate.length <= maxChars) {
      return candidate;
    }
  }

  // Even zero findings + notice is too long — hard-truncate
  const base = renderFn(
    opts.mode === 'compact'
      ? { ...payload, highlights: [] }
      : { ...payload, findings: [] }
  ) + TRUNCATION_NOTICE;

  return base.slice(0, maxChars);
}

// -- Public API --------------------------------------------------------------

/**
 * Render a DiffPRCommentPayload to a Markdown string.
 *
 * @param payload  Assembled payload from buildDiffPRCommentPayload().
 * @param opts     Rendering mode and optional character limit.
 * @returns        GitHub-compatible Markdown string.
 */
export function renderDiffPRComment(
  payload: DiffPRCommentPayload,
  opts: RenderDiffPRCommentOpts
): string {
  const renderFn = opts.mode === 'compact' ? renderCompact : renderFull;
  const output = renderFn(payload);

  if (opts.maxChars !== undefined && output.length > opts.maxChars) {
    return truncateToMaxChars(payload, opts, opts.maxChars);
  }

  return output;
}
