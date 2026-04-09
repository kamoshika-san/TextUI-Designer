const assert = require('assert');
const {
  isNavigationCoverageEntry,
  collectNavigationEntries,
  evaluateNavigationCoverage
} = require('../../scripts/check-navigation-coverage.cjs');

describe('check-navigation-coverage script', () => {
  it('accepts navigation coverage entries from absolute POSIX paths', () => {
    assert.strictEqual(
      isNavigationCoverageEntry('/home/runner/work/TextUI-Designer/TextUI-Designer/src/cli/commands/flow-command.ts'),
      true
    );
  });

  it('accepts navigation coverage entries from Windows-style absolute paths', () => {
    assert.strictEqual(
      isNavigationCoverageEntry('C:\\code_lab\\TextUI-Designer\\src\\exporters\\flow-react-exporter.ts'),
      true
    );
  });

  it('rejects non-navigation coverage entries', () => {
    assert.strictEqual(isNavigationCoverageEntry('src/cli/index.ts'), false);
    assert.strictEqual(isNavigationCoverageEntry('src/services/theme-manager.ts'), false);
    assert.strictEqual(isNavigationCoverageEntry('total'), false);
  });

  it('collects navigation entries across mixed path formats', () => {
    const navigationEntries = collectNavigationEntries({
      total: {},
      'src/cli/commands/flow-command.ts': { statements: { total: 1, covered: 1 }, branches: { total: 1, covered: 1 }, functions: { total: 1, covered: 1 }, lines: { total: 1, covered: 1 } },
      '/home/runner/work/TextUI-Designer/TextUI-Designer/src/services/semantic-diff/flow-semantic-diff-engine.ts': { statements: { total: 1, covered: 1 }, branches: { total: 1, covered: 1 }, functions: { total: 1, covered: 1 }, lines: { total: 1, covered: 1 } },
      'C:\\code_lab\\TextUI-Designer\\src\\services\\theme-manager.ts': { statements: { total: 1, covered: 1 }, branches: { total: 1, covered: 1 }, functions: { total: 1, covered: 1 }, lines: { total: 1, covered: 1 } }
    });

    assert.strictEqual(navigationEntries.length, 2);
  });

  it('passes when navigation coverage entries meet thresholds', () => {
    const result = evaluateNavigationCoverage({
      'src/cli/commands/flow-command.ts': {
        statements: { total: 10, covered: 9 },
        branches: { total: 10, covered: 8 },
        functions: { total: 10, covered: 9 },
        lines: { total: 10, covered: 9 }
      }
    });

    assert.strictEqual(result.navigationEntries.length, 1);
    assert.deepStrictEqual(result.failures, []);
  });

  it('reports the no-entry failure when navigation coverage is missing', () => {
    const result = evaluateNavigationCoverage({
      'src/cli/index.ts': {
        statements: { total: 10, covered: 10 },
        branches: { total: 10, covered: 10 },
        functions: { total: 10, covered: 10 },
        lines: { total: 10, covered: 10 }
      }
    });

    assert.strictEqual(result.navigationEntries.length, 0);
    assert.deepStrictEqual(result.failures, ['no-navigation-entries']);
  });
});
