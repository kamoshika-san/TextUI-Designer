'use strict';

const fs = require('fs');
const path = require('path');

const COVERAGE_SUMMARY_PATH = path.resolve('coverage/coverage-summary.json');
const CLI_SCOPE_SEGMENTS = ['src', 'cli'];
const DEFAULT_THRESHOLDS = {
  statements: Number(process.env.TEXTUI_CLI_COVERAGE_STATEMENTS ?? 80),
  branches: Number(process.env.TEXTUI_CLI_COVERAGE_BRANCHES ?? 70),
  functions: Number(process.env.TEXTUI_CLI_COVERAGE_FUNCTIONS ?? 90),
  lines: Number(process.env.TEXTUI_CLI_COVERAGE_LINES ?? 80)
};

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

function isCliCoverageEntry(filePath) {
  if (!filePath || filePath === 'total') {
    return false;
  }

  const normalizedPath = normalizeCoveragePath(filePath);
  return normalizedPath.includes('/src/cli/') || normalizedPath.startsWith('src/cli/');
}

function collectCliEntries(coverageSummary) {
  return Object.entries(coverageSummary).filter(([filePath]) => isCliCoverageEntry(filePath));
}

function evaluateCliCoverage(coverageSummary, thresholds = DEFAULT_THRESHOLDS) {
  const cliEntries = collectCliEntries(coverageSummary);

  if (cliEntries.length === 0) {
    return {
      cliEntries,
      aggregate: null,
      failures: ['no-cli-entries']
    };
  }

  const aggregate = {
    statements: { total: 0, covered: 0 },
    branches: { total: 0, covered: 0 },
    functions: { total: 0, covered: 0 },
    lines: { total: 0, covered: 0 }
  };

  for (const [, fileCoverage] of cliEntries) {
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

  return { cliEntries, aggregate, failures };
}

function runCliCoverageGate() {
  if (!fs.existsSync(COVERAGE_SUMMARY_PATH)) {
    console.error(`[cli-coverage] ERROR: coverage summary not found: ${COVERAGE_SUMMARY_PATH}`);
    process.exit(1);
  }

  const coverageSummary = JSON.parse(fs.readFileSync(COVERAGE_SUMMARY_PATH, 'utf8'));
  const { cliEntries, aggregate, failures } = evaluateCliCoverage(coverageSummary);

  if (cliEntries.length === 0) {
    console.error(`[cli-coverage] ERROR: no CLI coverage entries found under src/cli/**`);
    process.exit(1);
  }

  console.log(`[cli-coverage] checking CLI coverage across ${cliEntries.length} file(s)`);

  for (const metricName of Object.keys(aggregate)) {
    const pct = Number(formatPct(aggregate[metricName]));
    const threshold = DEFAULT_THRESHOLDS[metricName];
    const status = pct >= threshold ? 'PASS' : 'FAIL';
    console.log(
      `[cli-coverage] ${metricName}: threshold=${threshold}, current=${pct.toFixed(2)}, status=${status}`
    );
  }

  appendStepSummary([
    '## CLI Coverage Gate',
    `- Scope: \`src/cli/**\``,
    `- Files: ${cliEntries.length}`,
    `- Statements: ${formatPct(aggregate.statements)}% (threshold ${DEFAULT_THRESHOLDS.statements}%)`,
    `- Branches: ${formatPct(aggregate.branches)}% (threshold ${DEFAULT_THRESHOLDS.branches}%)`,
    `- Functions: ${formatPct(aggregate.functions)}% (threshold ${DEFAULT_THRESHOLDS.functions}%)`,
    `- Lines: ${formatPct(aggregate.lines)}% (threshold ${DEFAULT_THRESHOLDS.lines}%)`
  ]);

  if (failures.length > 0) {
    console.error(`[cli-coverage] FAIL: ${failures.join('; ')}`);
    process.exit(1);
  }

  console.log('[cli-coverage] PASS: CLI slice meets the current baseline');
}

if (require.main === module) {
  runCliCoverageGate();
}

module.exports = {
  normalizeCoveragePath,
  isCliCoverageEntry,
  collectCliEntries,
  evaluateCliCoverage
};
