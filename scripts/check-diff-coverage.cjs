/**
 * check-diff-coverage.cjs (T-20260331-410)
 *
 * CI guard: validates that every rule_id marked `required: true` in the diff
 * policy appears in both:
 *   1. The fixture index  (tests/fixtures/diff-acceptance/index.json)
 *   2. The test registry  (annotations in tests/unit/ and tests/fixtures/diff-acceptance/)
 *
 * Policy source: docs/diff-*.md files, parsed for:
 *   - `## Rule: {rule_id}` headings (rule registration)
 *   - `required: true` metadata in the rule block (marks the rule as mandated)
 *
 * Exit codes:
 *   0  — all required rules have fixture + test coverage (or no required rules defined)
 *   1  — one or more required rules are missing coverage
 *
 * Output format on failure:
 *   MISSING rule_id: {rule_id}
 *   Expected fixture: tests/fixtures/diff-acceptance/{expected_filename}
 *   Doc reference: {doc_file}:{line}
 *
 * Usage:
 *   node scripts/check-diff-coverage.cjs
 *   npm run test:diff-coverage-guard
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const FIXTURE_INDEX_PATH = path.join(ROOT, 'tests', 'fixtures', 'diff-acceptance', 'index.json');
const UNIT_TESTS_DIR = path.join(ROOT, 'tests', 'unit');
const TRACEABILITY_MATRIX = path.join(ROOT, 'docs', 'generated', 'diff-traceability-matrix.md');

// ---------------------------------------------------------------------------
// Step 1: Parse policy from docs — extract required rule_ids
// ---------------------------------------------------------------------------

/**
 * Scan all docs/diff-*.md files for rule blocks of the form:
 *
 *   ## Rule: {rule_id}
 *   ...
 *   required: true
 *   ...
 *
 * A rule is "required" when the line `required: true` appears within
 * the same rule block (between this `## Rule:` heading and the next `##`).
 *
 * Returns an array of:
 *   { ruleId, docFile, line }
 */
function extractRequiredRules() {
  const required = [];

  if (!fs.existsSync(DOCS_DIR)) {
    return required;
  }

  const docFiles = fs.readdirSync(DOCS_DIR)
    .filter(f => f.startsWith('diff-') && f.endsWith('.md'))
    .sort();

  for (const docFile of docFiles) {
    const filePath = path.join(DOCS_DIR, docFile);
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');

    let currentRule = null;
    let currentRuleLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const ruleMatch = line.match(/^##\s+Rule:\s+(\S+)/i);

      if (ruleMatch) {
        // Close previous rule block
        currentRule = ruleMatch[1].trim();
        currentRuleLine = i + 1; // 1-indexed
        continue;
      }

      // New section (## something else) closes the current rule block
      if (currentRule && /^##\s+/.test(line) && !line.match(/^##\s+Rule:/i)) {
        currentRule = null;
        continue;
      }

      // Check for required: true within current rule block
      if (currentRule && /^\s*required:\s*true\s*$/i.test(line)) {
        required.push({
          ruleId: currentRule,
          docFile,
          line: currentRuleLine
        });
        // Don't reset currentRule — it may appear multiple times (idempotent)
      }
    }
  }

  return required;
}

// ---------------------------------------------------------------------------
// Step 2: Load fixture index — build set of covered rule_families
// ---------------------------------------------------------------------------

/**
 * Returns a Set of rule_family values from the fixture index, plus the
 * full fixture list for generating expected filenames.
 */
function loadFixtureIndex() {
  if (!fs.existsSync(FIXTURE_INDEX_PATH)) {
    console.error(`[check-diff-coverage] ERROR: fixture index not found: ${FIXTURE_INDEX_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(FIXTURE_INDEX_PATH, 'utf8');
  const index = JSON.parse(raw);

  const families = new Set();
  const fixturesByFamily = {};

  for (const fixture of index.fixtures) {
    families.add(fixture.rule_family);
    if (!fixturesByFamily[fixture.rule_family]) {
      fixturesByFamily[fixture.rule_family] = [];
    }
    fixturesByFamily[fixture.rule_family].push(fixture.fixture_file);
  }

  return { families, fixturesByFamily };
}

// ---------------------------------------------------------------------------
// Step 3: Build test registry — scan for rule_id annotations
// ---------------------------------------------------------------------------

/**
 * Scan test files for rule_id annotations. Annotations are recognized as:
 *   - `// rule_id: {id}` comments (single-line)
 *   - `rule_id: '{id}'` or `rule_id: "{id}"` in describe() / it() strings
 *   - `@rule_id {id}` in JSDoc comments
 *   - The string `rule_id` anywhere in the filename
 *
 * Returns a Set of rule_ids that appear in any test file or fixture JSON.
 */
function buildTestRegistry() {
  const found = new Set();

  // Scan unit test files
  if (fs.existsSync(UNIT_TESTS_DIR)) {
    const testFiles = fs.readdirSync(UNIT_TESTS_DIR)
      .filter(f => f.endsWith('.test.js') || f.endsWith('.test.ts'));

    for (const testFile of testFiles) {
      const content = fs.readFileSync(path.join(UNIT_TESTS_DIR, testFile), 'utf8');
      // Match: // rule_id: foo, @rule_id foo, rule_id: 'foo', rule_id: "foo"
      const patterns = [
        /\/\/\s*rule_id:\s*(\S+)/gi,
        /@rule_id\s+(\S+)/gi,
        /rule_id:\s*['"]([^'"]+)['"]/gi,
        /rule[_-]family:\s*['"]([^'"]+)['"]/gi
      ];
      for (const pattern of patterns) {
        let m;
        const re = new RegExp(pattern.source, pattern.flags);
        while ((m = re.exec(content)) !== null) {
          found.add(m[1].toLowerCase().trim());
        }
      }
    }
  }

  // Also scan fixture JSON files for rule_family annotations
  const fixturesDir = path.join(ROOT, 'tests', 'fixtures', 'diff-acceptance');
  if (fs.existsSync(fixturesDir)) {
    const jsonFiles = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.json'));
    for (const jsonFile of jsonFiles) {
      if (jsonFile === 'index.json') { continue; }
      try {
        const content = fs.readFileSync(path.join(fixturesDir, jsonFile), 'utf8');
        const data = JSON.parse(content);
        if (data.rule_family) { found.add(data.rule_family.toLowerCase().trim()); }
        if (data.rule_id) { found.add(data.rule_id.toLowerCase().trim()); }
      } catch { /* ignore malformed fixture */ }
    }
  }

  return found;
}

// ---------------------------------------------------------------------------
// Step 4: Match rule_id to fixture family
// ---------------------------------------------------------------------------

/**
 * A rule_id "covers" a fixture family when:
 *   - rule_id === family (exact)
 *   - rule_id starts with family + '-'
 *   - family starts with rule_id + '-'
 *
 * This matches the convention used in generate-diff-traceability.cjs.
 */
function findMatchingFamily(ruleId, families) {
  const lower = ruleId.toLowerCase();
  for (const family of families) {
    if (lower === family || lower.startsWith(family + '-') || family.startsWith(lower + '-')) {
      return family;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Step 5: Report and exit
// ---------------------------------------------------------------------------

function main() {
  console.log('[check-diff-coverage] checking diff coverage guard...');

  // Parse required rules from policy docs
  const requiredRules = extractRequiredRules();

  if (requiredRules.length === 0) {
    console.log('[check-diff-coverage] PASS — no required rule_ids defined in docs/diff-*.md (nothing to check)');
    process.exit(0);
  }

  console.log(`[check-diff-coverage] found ${requiredRules.length} required rule(s): ${requiredRules.map(r => r.ruleId).join(', ')}`);

  // Load fixture index
  const { families, fixturesByFamily } = loadFixtureIndex();

  // Build test registry
  const testRegistry = buildTestRegistry();

  // Check each required rule
  let missingCount = 0;

  for (const entry of requiredRules) {
    const matchedFamily = findMatchingFamily(entry.ruleId, families);
    const inFixtureIndex = matchedFamily !== null;
    const inTestRegistry = testRegistry.has(entry.ruleId.toLowerCase()) ||
                           (matchedFamily !== null && testRegistry.has(matchedFamily.toLowerCase()));

    if (inFixtureIndex && inTestRegistry) {
      continue; // covered
    }

    missingCount++;

    // Determine expected fixture filename pattern
    const expectedFixture = matchedFamily
      ? (fixturesByFamily[matchedFamily]?.[0] ?? `${entry.ruleId}-001-positive.json`)
      : `${entry.ruleId}-001-positive.json`;

    console.error(`MISSING rule_id: ${entry.ruleId}`);
    console.error(`  Expected fixture: tests/fixtures/diff-acceptance/${expectedFixture}`);
    console.error(`  Doc reference: ${entry.docFile}:${entry.line}`);
    if (!inFixtureIndex) {
      console.error(`  Reason: no fixture with rule_family matching '${entry.ruleId}'`);
    }
    if (!inTestRegistry) {
      console.error(`  Reason: no test annotation for rule_id '${entry.ruleId}'`);
    }
    console.error('');
  }

  if (missingCount > 0) {
    console.error(`[check-diff-coverage] FAIL — ${missingCount} required rule(s) missing coverage`);
    process.exit(1);
  }

  console.log(`[check-diff-coverage] PASS — all ${requiredRules.length} required rule(s) have fixture + test coverage`);
  process.exit(0);
}

main();
