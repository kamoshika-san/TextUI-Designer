import * as fs from 'fs';
import * as path from 'path';
import type { TextUIDSL } from '../src/domain/dsl-types';
import {
  createDiffResultSkeleton,
  createNormalizedDiffDocument,
  type DiffCompareResult,
  type DiffAmbiguityReason,
  type DiffEvent,
  type DiffHeuristicRejection,
} from '../src/core/textui-core-diff';
import type { HeuristicPolicy } from '../src/core/diff/heuristic-policy';

export type MatrixOutcome = 'accept' | 'accept-review' | 'fallback' | 'reject-ambiguous';

export interface MatrixFixtureRecord {
  fixtureId: string;
  family: string;
  description: string;
  outcome: MatrixOutcome;
  evidence: {
    heuristicAccepted: boolean;
    heuristicReview: boolean;
    fallbackApplied: boolean;
    ambiguityReasons: string[];
    rejectedBy: string[];
  };
}

export interface MatrixSnapshot {
  kind: 'diff-matrix-snapshot/v1';
  fixtures: MatrixFixtureRecord[];
}

export interface MatrixCoverageDelta {
  missingFromCurrent: string[];
  addedInCurrent: string[];
  familyCounts: {
    baseline: Record<string, number>;
    current: Record<string, number>;
  };
}

export interface MatrixOutcomeDelta {
  fixtureId: string;
  description: string;
  baselineOutcome: MatrixOutcome;
  currentOutcome: MatrixOutcome;
}

export interface MatrixDeltaReport {
  kind: 'diff-matrix-delta-report/v1';
  baselinePath: string;
  outputs: {
    jsonPath: string;
    markdownPath: string;
  };
  summary: {
    baselineFixtureCount: number;
    currentFixtureCount: number;
    missingFromCurrentCount: number;
    addedInCurrentCount: number;
    outcomeDeltaCount: number;
  };
  coverage: MatrixCoverageDelta;
  outcomeDelta: MatrixOutcomeDelta[];
  current: MatrixSnapshot;
}

type MatrixScenario = {
  fixtureId: string;
  description: string;
  previousComponents: unknown[];
  nextComponents: unknown[];
  policy?: HeuristicPolicy;
};

const ROOT = path.resolve(__dirname, '..');
const GENERATED_DIR = path.join(ROOT, 'docs', 'generated');
const DEFAULT_BASELINE_PATH = path.join(ROOT, 'docs', 'matrix-baseline.json');
const DEFAULT_JSON_OUTPUT_PATH = path.join(GENERATED_DIR, 'matrix-delta.json');
const DEFAULT_MARKDOWN_OUTPUT_PATH = path.join(GENERATED_DIR, 'matrix-delta.md');

function page(components: unknown[]): TextUIDSL {
  return {
    page: {
      id: 'matrix-page',
      title: 'Matrix',
      layout: 'vertical',
      components: components as TextUIDSL['page']['components'],
    },
  };
}

const MATRIX_SCENARIOS: MatrixScenario[] = [
  {
    fixtureId: 'HH-N1',
    description: 'Alias collapse rescue',
    previousComponents: [{ Text: { label: 'hello alias' } }],
    nextComponents: [{ Text: { label: 'hello alias' } }],
  },
  {
    fixtureId: 'HH-N2',
    description: 'Canonical typing rescue',
    previousComponents: [{ Input: { label: 'Email', placeholder: 'user@example.com' } }],
    nextComponents: [{ Input: { label: 'Email', placeholder: 'user@example.com' } }],
  },
  {
    fixtureId: 'HH-N3',
    description: 'Shorthand projection rescue',
    previousComponents: [{ Button: { label: 'Save draft' } }],
    nextComponents: [{ Button: { label: 'Save draft' } }],
  },
  {
    fixtureId: 'HH-N4',
    description: 'Wrapper-free rescue (same-parent reorder)',
    previousComponents: [
      { Text: { value: 'Alpha', variant: 'h1' } },
      { Text: { value: 'Beta', variant: 'p' } },
    ],
    nextComponents: [
      { Text: { value: 'Beta', variant: 'p' } },
      { Text: { value: 'Alpha', variant: 'h1' } },
    ],
  },
  {
    fixtureId: 'HH-N5',
    description: 'Default explicitness rescue',
    previousComponents: [{ Checkbox: { label: 'Receive updates', checked: true } }],
    nextComponents: [{ Checkbox: { label: 'Receive updates', checked: true } }],
  },
  {
    fixtureId: 'HH-N6',
    description: 'Duplicate collapse rescue',
    previousComponents: [{ Badge: { label: 'Preview', tone: 'info' } }],
    nextComponents: [{ Badge: { label: 'Preview', tone: 'info' } }],
  },
  {
    fixtureId: 'HH-FZ01',
    description: 'Children to actions must not rescue',
    previousComponents: [{ Box: { children: [{ Text: { label: 'save' } }], actions: [] } }],
    nextComponents: [{ Box: { children: [], actions: [{ Text: { label: 'save' } }] } }],
  },
  {
    fixtureId: 'HH-FZ02',
    description: 'Actions to children must not rescue',
    previousComponents: [{ Box: { actions: [{ Text: { label: 'publish' } }], children: [] } }],
    nextComponents: [{ Box: { actions: [], children: [{ Text: { label: 'publish' } }] } }],
  },
  {
    fixtureId: 'HH-FZ03',
    description: 'Fields to actions must not rescue',
    previousComponents: [{ Form: { fields: [{ Button: { label: 'apply' } }], actions: [] } }],
    nextComponents: [{ Form: { fields: [], actions: [{ Button: { label: 'apply' } }] } }],
  },
  {
    fixtureId: 'HH-FZ04',
    description: 'Items to children must not rescue',
    previousComponents: [{ Box: { items: [{ Text: { label: 'row' } }], children: [] } }],
    nextComponents: [{ Box: { items: [], children: [{ Text: { label: 'row' } }] } }],
  },
  {
    fixtureId: 'HH-FZ05',
    description: 'Actions to items must not rescue',
    previousComponents: [{ Box: { actions: [{ Button: { label: 'go' } }], items: [] } }],
    nextComponents: [{ Box: { actions: [], items: [{ Button: { label: 'go' } }] } }],
  },
  {
    fixtureId: 'HH-FZ06',
    description: 'Fields to items must not rescue',
    previousComponents: [{ Box: { fields: [{ Text: { label: 'ownerless' } }], items: [] } }],
    nextComponents: [{ Box: { fields: [], items: [{ Text: { label: 'ownerless' } }] } }],
  },
  {
    fixtureId: 'HH-MC01',
    description: 'Tie-best-score ambiguity',
    previousComponents: [{ Text: { label: 'hello' } }],
    nextComponents: [{ Text: { label: 'hello' } }, { Text: { label: 'hello' } }],
  },
  {
    fixtureId: 'HH-MC02',
    description: 'Multi-candidate ambiguity',
    previousComponents: [
      { Text: { label: 'x', extra: '1' } },
      { Text: { label: 'x' } },
    ],
    nextComponents: [
      { Text: { label: 'x', extra: '1' } },
      { Text: { label: 'y' } },
    ],
  },
  {
    fixtureId: 'HH-MC03',
    description: 'Below-threshold ambiguity',
    previousComponents: [{ Text: { label: 'a' } }],
    nextComponents: [{ Text: { label: 'a' } }],
    policy: {
      minScore: 4,
      weightScalarExact: 2,
      weightChildSignature: 1,
      weightKeysetMatch: 1,
      requireMutualBest: true,
      rejectTie: true,
    },
  },
];

function familyFromFixtureId(fixtureId: string): string {
  const match = fixtureId.match(/^[A-Z]+-[A-Z]+|^[A-Z]+-[A-Z]+\d*|^[A-Z]+-[A-Z]+/);
  if (fixtureId.startsWith('HH-FZ')) {
    return 'HH-FZ';
  }
  if (fixtureId.startsWith('HH-MC')) {
    return 'HH-MC';
  }
  if (fixtureId.startsWith('HH-N')) {
    return 'HH-N';
  }
  return match?.[0] ?? fixtureId;
}

function buildResult(
  previousComponents: unknown[],
  nextComponents: unknown[],
  policy?: HeuristicPolicy
): DiffCompareResult {
  return createDiffResultSkeleton(
    createNormalizedDiffDocument(page(previousComponents), { side: 'previous' }),
    createNormalizedDiffDocument(page(nextComponents), { side: 'next' }),
    policy
  );
}

function summarizeEvidence(events: DiffEvent[]) {
  const componentEvents = events.filter((event) => event.entityKind === 'component');
  const ambiguityReasons = Array.from(
    new Set(
      componentEvents
        .map((event) => event.trace.ambiguityReason)
        .filter((reason): reason is DiffAmbiguityReason => reason !== undefined)
    )
  ).sort();
  const rejectedBy = Array.from(
    new Set(
      componentEvents
        .map((event) => event.trace.heuristicTrace?.rejectedBy)
        .filter((reason): reason is DiffHeuristicRejection => reason !== undefined)
    )
  ).sort();

  return {
    heuristicAccepted: componentEvents.some((event) => event.trace.pairingReason === 'heuristic-similarity'),
    heuristicReview: componentEvents.some(
      (event) => event.trace.pairingReason === 'heuristic-similarity' && event.kind !== 'update'
    ),
    fallbackApplied: componentEvents.some((event) => event.trace.fallbackMarker === 'remove-add-fallback'),
    ambiguityReasons,
    rejectedBy,
  };
}

function classifyOutcome(result: DiffCompareResult): Pick<MatrixFixtureRecord, 'outcome' | 'evidence'> {
  const evidence = summarizeEvidence(result.events);

  if (evidence.rejectedBy.includes('forbidden-zone')) {
    return { outcome: 'fallback', evidence };
  }

  if (evidence.ambiguityReasons.length > 0) {
    return { outcome: 'reject-ambiguous', evidence };
  }

  if (evidence.fallbackApplied) {
    return { outcome: 'fallback', evidence };
  }

  if (evidence.heuristicReview) {
    return { outcome: 'accept-review', evidence };
  }

  return { outcome: 'accept', evidence };
}

export function buildCurrentMatrixSnapshot(): MatrixSnapshot {
  return {
    kind: 'diff-matrix-snapshot/v1',
    fixtures: MATRIX_SCENARIOS.map((scenario) => {
      const scenarioResult = buildResult(scenario.previousComponents, scenario.nextComponents, scenario.policy);
      const classification = classifyOutcome(scenarioResult);
      return {
        fixtureId: scenario.fixtureId,
        family: familyFromFixtureId(scenario.fixtureId),
        description: scenario.description,
        outcome: classification.outcome,
        evidence: classification.evidence,
      };
    }),
  };
}

function indexByFixtureId(snapshot: MatrixSnapshot): Map<string, MatrixFixtureRecord> {
  return new Map(snapshot.fixtures.map((fixture) => [fixture.fixtureId, fixture]));
}

function countByFamily(snapshot: MatrixSnapshot): Record<string, number> {
  return snapshot.fixtures.reduce<Record<string, number>>((counts, fixture) => {
    counts[fixture.family] = (counts[fixture.family] ?? 0) + 1;
    return counts;
  }, {});
}

export function compareSnapshots(baseline: MatrixSnapshot, current: MatrixSnapshot): {
  coverage: MatrixCoverageDelta;
  outcomeDelta: MatrixOutcomeDelta[];
} {
  const baselineById = indexByFixtureId(baseline);
  const currentById = indexByFixtureId(current);

  const missingFromCurrent = [...baselineById.keys()].filter((fixtureId) => !currentById.has(fixtureId)).sort();
  const addedInCurrent = [...currentById.keys()].filter((fixtureId) => !baselineById.has(fixtureId)).sort();

  const outcomeDelta: MatrixOutcomeDelta[] = [...baselineById.entries()]
    .flatMap(([fixtureId, baselineFixture]) => {
      const currentFixture = currentById.get(fixtureId);
      if (!currentFixture || currentFixture.outcome === baselineFixture.outcome) {
        return [];
      }
      return [{
        fixtureId,
        description: currentFixture.description,
        baselineOutcome: baselineFixture.outcome,
        currentOutcome: currentFixture.outcome,
      }];
    })
    .sort((left, right) => left.fixtureId.localeCompare(right.fixtureId));

  return {
    coverage: {
      missingFromCurrent,
      addedInCurrent,
      familyCounts: {
        baseline: countByFamily(baseline),
        current: countByFamily(current),
      },
    },
    outcomeDelta,
  };
}

export function buildDeltaReport(
  baseline: MatrixSnapshot,
  current: MatrixSnapshot,
  options: {
    baselinePath?: string;
    jsonPath?: string;
    markdownPath?: string;
  } = {}
): MatrixDeltaReport {
  const comparison = compareSnapshots(baseline, current);
  return {
    kind: 'diff-matrix-delta-report/v1',
    baselinePath: options.baselinePath ?? DEFAULT_BASELINE_PATH,
    outputs: {
      jsonPath: options.jsonPath ?? DEFAULT_JSON_OUTPUT_PATH,
      markdownPath: options.markdownPath ?? DEFAULT_MARKDOWN_OUTPUT_PATH,
    },
    summary: {
      baselineFixtureCount: baseline.fixtures.length,
      currentFixtureCount: current.fixtures.length,
      missingFromCurrentCount: comparison.coverage.missingFromCurrent.length,
      addedInCurrentCount: comparison.coverage.addedInCurrent.length,
      outcomeDeltaCount: comparison.outcomeDelta.length,
    },
    coverage: comparison.coverage,
    outcomeDelta: comparison.outcomeDelta,
    current,
  };
}

function renderFamilyCountTable(counts: Record<string, number>): string[] {
  return Object.keys(counts)
    .sort()
    .map((family) => `| ${family} | ${counts[family]} |`);
}

export function renderMarkdownReport(report: MatrixDeltaReport): string {
  const lines: string[] = [
    '# Diff Matrix Delta',
    '',
    `- Baseline: \`${path.relative(ROOT, report.baselinePath).replace(/\\/g, '/')}\``,
    `- Current fixtures: ${report.summary.currentFixtureCount}`,
    `- Coverage delta count: ${report.summary.missingFromCurrentCount + report.summary.addedInCurrentCount}`,
    `- Outcome delta count: ${report.summary.outcomeDeltaCount}`,
    '',
    '## Coverage Delta',
    '',
    `- Missing from current: ${report.coverage.missingFromCurrent.length === 0 ? 'none' : report.coverage.missingFromCurrent.join(', ')}`,
    `- Added in current: ${report.coverage.addedInCurrent.length === 0 ? 'none' : report.coverage.addedInCurrent.join(', ')}`,
    '',
    '### Family Counts (baseline)',
    '',
    '| Family | Count |',
    '|---|---:|',
    ...renderFamilyCountTable(report.coverage.familyCounts.baseline),
    '',
    '### Family Counts (current)',
    '',
    '| Family | Count |',
    '|---|---:|',
    ...renderFamilyCountTable(report.coverage.familyCounts.current),
    '',
    '## Outcome Delta',
    '',
  ];

  if (report.outcomeDelta.length === 0) {
    lines.push('- No outcome delta.');
  } else {
    lines.push('| Fixture ID | Description | Baseline | Current |');
    lines.push('|---|---|---|---|');
    for (const delta of report.outcomeDelta) {
      lines.push(`| ${delta.fixtureId} | ${delta.description} | ${delta.baselineOutcome} | ${delta.currentOutcome} |`);
    }
  }

  return `${lines.join('\n')}\n`;
}

export function renderCliSummary(report: MatrixDeltaReport): string {
  const lines: string[] = [
    'Diff Matrix Delta',
    `Baseline fixtures: ${report.summary.baselineFixtureCount}`,
    `Current fixtures: ${report.summary.currentFixtureCount}`,
    `Missing from current: ${report.coverage.missingFromCurrent.length === 0 ? 'none' : report.coverage.missingFromCurrent.join(', ')}`,
    `Added in current: ${report.coverage.addedInCurrent.length === 0 ? 'none' : report.coverage.addedInCurrent.join(', ')}`,
    `Outcome delta: ${report.outcomeDelta.length === 0 ? 'none' : report.outcomeDelta.map((item) => `${item.fixtureId}:${item.baselineOutcome}->${item.currentOutcome}`).join(', ')}`,
  ];

  return `${lines.join('\n')}\n`;
}

function ensureDir(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function writeJsonFile(filePath: string, value: unknown): void {
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function readSnapshot(filePath: string): MatrixSnapshot {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as MatrixSnapshot;
}

type CliOptions = {
  baselinePath: string;
  jsonPath: string;
  markdownPath: string;
  writeBaseline: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    baselinePath: DEFAULT_BASELINE_PATH,
    jsonPath: DEFAULT_JSON_OUTPUT_PATH,
    markdownPath: DEFAULT_MARKDOWN_OUTPUT_PATH,
    writeBaseline: false,
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--baseline' && argv[index + 1]) {
      options.baselinePath = path.resolve(argv[++index]);
    } else if (arg === '--json' && argv[index + 1]) {
      options.jsonPath = path.resolve(argv[++index]);
    } else if (arg === '--md' && argv[index + 1]) {
      options.markdownPath = path.resolve(argv[++index]);
    } else if (arg === '--write-baseline') {
      options.writeBaseline = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

export function runCli(argv: string[]): MatrixDeltaReport {
  const options = parseArgs(argv);
  const current = buildCurrentMatrixSnapshot();

  if (options.writeBaseline) {
    writeJsonFile(options.baselinePath, current);
  }

  if (!fs.existsSync(options.baselinePath)) {
    throw new Error(`Baseline snapshot not found: ${options.baselinePath}`);
  }

  const baseline = readSnapshot(options.baselinePath);
  const report = buildDeltaReport(baseline, current, options);
  writeJsonFile(options.jsonPath, report);
  ensureDir(options.markdownPath);
  fs.writeFileSync(options.markdownPath, renderMarkdownReport(report), 'utf8');
  process.stdout.write(renderCliSummary(report));
  return report;
}

if (require.main === module) {
  runCli(process.argv.slice(2));
}
