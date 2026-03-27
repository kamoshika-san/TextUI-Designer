const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

const runtimeFallbackEntryFiles = [
  'src/cli/commands/capture-command.ts'
];

const fallbackHelperFiles = [
  'src/exporters/html-export-lane-options.ts'
];

const primaryDefaultRouteFiles = [
  'src/cli/provider-registry.ts',
  'src/utils/preview-capture/html-preparation.ts'
];

const fallbackExecutionTestFiles = [
  'tests/unit/html-exporter-lane-observability.test.js',
  'tests/unit/html-exporter-fallback-style-lane.test.js'
];

const fallbackGovernanceFiles = [
  'tests/unit/html-exporter-fallback-entry-guard.test.js',
  'tests/unit/html-exporter-route-viability.test.js',
  'tests/README.md',
  'docs/html-exporter-primary-fallback-inventory.md'
];

function countMatches(filePath, pattern) {
  const source = fs.readFileSync(path.join(repoRoot, filePath), 'utf8');
  const matches = source.match(pattern);
  return matches ? matches.length : 0;
}

function relList(title, files) {
  const lines = [`${title}: ${files.length}`];
  for (const file of files) {
    lines.push(`- ${file}`);
  }
  return lines;
}

const fallbackLiteralPattern = /\buseReactRender\s*:\s*false\b/g;
const fallbackHelperPattern = /\bwithExplicitFallbackHtmlExport\s*\(/g;
const primaryDefaultPattern = /\buseReactRender\s*\?\?\s*true\b/g;

const summary = {
  runtimeFallbackEntries: runtimeFallbackEntryFiles.length,
  fallbackHelpers: fallbackHelperFiles.length,
  primaryDefaultRoutes: primaryDefaultRouteFiles.length,
  fallbackExecutionTestFiles: fallbackExecutionTestFiles.length,
  fallbackGovernanceFiles: fallbackGovernanceFiles.length,
  explicitFalseLiteralsInExecutionTests: fallbackExecutionTestFiles.reduce(
    (sum, file) => sum + countMatches(file, fallbackLiteralPattern),
    0
  ),
  helperCallsInRuntimeSource: runtimeFallbackEntryFiles.reduce(
    (sum, file) => sum + countMatches(file, fallbackHelperPattern),
    0
  ),
  primaryDefaultMarkers: primaryDefaultRouteFiles.reduce(
    (sum, file) => sum + countMatches(file, primaryDefaultPattern),
    0
  )
};

console.log('# React fallback usage report');
console.log('');
console.log(`runtime fallback entries: ${summary.runtimeFallbackEntries}`);
console.log(`fallback helper definitions: ${summary.fallbackHelpers}`);
console.log(`primary-default routes: ${summary.primaryDefaultRoutes}`);
console.log(`fallback execution test files: ${summary.fallbackExecutionTestFiles}`);
console.log(`fallback governance files: ${summary.fallbackGovernanceFiles}`);
console.log(`explicit false literals in execution tests: ${summary.explicitFalseLiteralsInExecutionTests}`);
console.log(`helper calls in runtime source: ${summary.helperCallsInRuntimeSource}`);
console.log(`primary-default markers: ${summary.primaryDefaultMarkers}`);
console.log('');
for (const line of relList('runtime fallback entry files', runtimeFallbackEntryFiles)) {
  console.log(line);
}
for (const line of relList('fallback helper files', fallbackHelperFiles)) {
  console.log(line);
}
for (const line of relList('primary-default route files', primaryDefaultRouteFiles)) {
  console.log(line);
}
for (const line of relList('fallback execution test files', fallbackExecutionTestFiles)) {
  console.log(line);
}
for (const line of relList('fallback governance files', fallbackGovernanceFiles)) {
  console.log(line);
}
