'use strict';

const fs = require('fs');
const path = require('path');

const COVERAGE_SUMMARY_PATH = path.resolve('coverage/coverage-summary.json');
const DEFAULT_THRESHOLDS = {
  statements: Number(process.env.TEXTUI_NAV_COVERAGE_STATEMENTS ?? 80),
  branches: Number(process.env.TEXTUI_NAV_COVERAGE_BRANCHES ?? 70),
  functions: Number(process.env.TEXTUI_NAV_COVERAGE_FUNCTIONS ?? 80),
  lines: Number(process.env.TEXTUI_NAV_COVERAGE_LINES ?? 80)
};

const NAVIGATION_SCOPE_MATCHERS = [
  /(^|\/)src\/cli\/commands\/flow-command\.ts$/,
  /(^|\/)src\/core\/diff-normalization\/flow-normalizer\.ts$/,
  /(^|\/)src\/domain\/dsl-types\/navigation\.ts$/,
  /(^|\/)src\/exporters\/flow-(react|vue|svelte|html)-exporter\.ts$/,
  /(^|\/)src\/exporters\/flow-export-route-utils\.ts$/,
  /(^|\/)src\/services\/diagnostics\/flow-diagnostics-manager\.ts$/,
  /(^|\/)src\/services\/semantic-diff\/flow-(semantic-diff-engine|confidence-scoring)\.ts$/,
  /(^|\/)src\/shared\/navigation-flow-validator\.ts$/
];

function formatPct(metric) {
  return metric.total === 0 ? '100.00' : ((metric.covered / metric.total) * 100).toFixed(2);
}

function appendStepSummary(lines) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    return;
  }

  fs.appendFileSync(summaryPath, `${lines.join('\n')}\n`, 'utf8');
}

function normalizeCoveragePath(filePath) {
  return path.normalize(filePath).replace(/[\\/]+/g, '/');
}

function isNavigationCoverageEntry(filePath) {
  if (!filePath || filePath === 'total') {
    return false;
  }

  const normalizedPath = normalizeCoveragePath(filePath);
  return NAVIGATION_SCOPE_MATCHERS.some(pattern => pattern.test(normalizedPath));
}

function collectNavigationEntries(coverageSummary) {
  return Object.entries(coverageSummary).filter(([filePath]) => isNavigationCoverageEntry(filePath));
}

function evaluateNavigationCoverage(coverageSummary, thresholds = DEFAULT_THRESHOLDS) {
  const navigationEntries = collectNavigationEntries(coverageSummary);

  if (navigationEntries.length === 0) {
    return {
      navigationEntries,
      aggregate: null,
      failures: ['no-navigation-entries']
    };
  }

  const aggregate = {
    statements: { total: 0, covered: 0 },
    branches: { total: 0, covered: 0 },
    functions: { total: 0, covered: 0 },
    lines: { total: 0, covered: 0 }
  };

  for (const [, fileCoverage] of navigationEntries) {
    for (const metricName of Object.keys(aggregate)) {
      aggregate[metricName].total += fileCoverage[metricName].total;
      aggregate[metricName].covered += fileCoverage[metricName].covered;
    }
  }

  const failures = [];
  for (const metricName of Object.keys(aggregate)) {
    const pct = Number(formatPct(aggregate[metricName]));
    const threshold = thresholds[metricName];
    if (pct < threshold) {
      failures.push(`${metricName} ${pct.toFixed(2)} < ${threshold}`);
    }
  }

  return { navigationEntries, aggregate, failures };
}

function runNavigationCoverageGate() {
  if (!fs.existsSync(COVERAGE_SUMMARY_PATH)) {
    console.error(`[navigation-coverage] ERROR: coverage summary not found: ${COVERAGE_SUMMARY_PATH}`);
    process.exit(1);
  }

  const coverageSummary = JSON.parse(fs.readFileSync(COVERAGE_SUMMARY_PATH, 'utf8'));
  const { navigationEntries, aggregate, failures } = evaluateNavigationCoverage(coverageSummary);

  if (navigationEntries.length === 0) {
    console.error('[navigation-coverage] ERROR: no navigation coverage entries found under the scoped flow/navigation files');
    process.exit(1);
  }

  console.log(`[navigation-coverage] checking navigation coverage across ${navigationEntries.length} file(s)`);

  for (const metricName of Object.keys(aggregate)) {
    const pct = Number(formatPct(aggregate[metricName]));
    const threshold = DEFAULT_THRESHOLDS[metricName];
    const status = pct >= threshold ? 'PASS' : 'FAIL';
    console.log(
      `[navigation-coverage] ${metricName}: threshold=${threshold}, current=${pct.toFixed(2)}, status=${status}`
    );
  }

  appendStepSummary([
    '## Navigation Coverage Gate',
    '- Scope: `flow-command`, `flow-normalizer`, `navigation validator`, `flow exporters`, `flow semantic diff`, `flow diagnostics`',
    `- Files: ${navigationEntries.length}`,
    `- Statements: ${formatPct(aggregate.statements)}% (threshold ${DEFAULT_THRESHOLDS.statements}%)`,
    `- Branches: ${formatPct(aggregate.branches)}% (threshold ${DEFAULT_THRESHOLDS.branches}%)`,
    `- Functions: ${formatPct(aggregate.functions)}% (threshold ${DEFAULT_THRESHOLDS.functions}%)`,
    `- Lines: ${formatPct(aggregate.lines)}% (threshold ${DEFAULT_THRESHOLDS.lines}%)`
  ]);

  if (failures.length > 0) {
    console.error(`[navigation-coverage] FAIL: ${failures.join('; ')}`);
    process.exit(1);
  }

  console.log('[navigation-coverage] PASS: navigation slice meets the current baseline');
}

if (require.main === module) {
  runNavigationCoverageGate();
}

module.exports = {
  normalizeCoveragePath,
  isNavigationCoverageEntry,
  collectNavigationEntries,
  evaluateNavigationCoverage
};
