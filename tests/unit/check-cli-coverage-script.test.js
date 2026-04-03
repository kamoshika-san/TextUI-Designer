const assert = require('assert');
const {
  isCliCoverageEntry,
  collectCliEntries,
  evaluateCliCoverage
} = require('../../scripts/check-cli-coverage.cjs');

describe('check-cli-coverage script', () => {
  it('accepts CLI coverage entries from absolute POSIX paths', () => {
    assert.strictEqual(
      isCliCoverageEntry('/home/runner/work/TextUI-Designer/TextUI-Designer/src/cli/index.ts'),
      true
    );
  });

  it('accepts CLI coverage entries from relative summary keys', () => {
    assert.strictEqual(isCliCoverageEntry('src/cli/index.ts'), true);
  });

  it('accepts CLI coverage entries from Windows-style absolute paths', () => {
    assert.strictEqual(
      isCliCoverageEntry('C:\\code_lab\\TextUI-Designer\\src\\cli\\commands\\export-command.ts'),
      true
    );
  });

  it('rejects non-CLI coverage entries', () => {
    assert.strictEqual(isCliCoverageEntry('src/services/theme-manager.ts'), false);
    assert.strictEqual(isCliCoverageEntry('total'), false);
  });

  it('collects CLI entries across mixed path formats', () => {
    const cliEntries = collectCliEntries({
      total: {},
      'src/cli/index.ts': { statements: { total: 1, covered: 1 }, branches: { total: 1, covered: 1 }, functions: { total: 1, covered: 1 }, lines: { total: 1, covered: 1 } },
      '/home/runner/work/TextUI-Designer/TextUI-Designer/src/cli/exporter-runner.ts': { statements: { total: 1, covered: 1 }, branches: { total: 1, covered: 1 }, functions: { total: 1, covered: 1 }, lines: { total: 1, covered: 1 } },
      'C:\\code_lab\\TextUI-Designer\\src\\services\\theme-manager.ts': { statements: { total: 1, covered: 1 }, branches: { total: 1, covered: 1 }, functions: { total: 1, covered: 1 }, lines: { total: 1, covered: 1 } }
    });

    assert.strictEqual(cliEntries.length, 2);
  });

  it('passes when CLI coverage entries are present and meet thresholds', () => {
    const result = evaluateCliCoverage({
      'src/cli/index.ts': {
        statements: { total: 10, covered: 10 },
        branches: { total: 10, covered: 10 },
        functions: { total: 10, covered: 10 },
        lines: { total: 10, covered: 10 }
      }
    });

    assert.strictEqual(result.cliEntries.length, 1);
    assert.deepStrictEqual(result.failures, []);
  });

  it('reports the no-entry failure when CLI coverage is genuinely missing', () => {
    const result = evaluateCliCoverage({
      'src/services/theme-manager.ts': {
        statements: { total: 10, covered: 10 },
        branches: { total: 10, covered: 10 },
        functions: { total: 10, covered: 10 },
        lines: { total: 10, covered: 10 }
      }
    });

    assert.strictEqual(result.cliEntries.length, 0);
    assert.deepStrictEqual(result.failures, ['no-cli-entries']);
  });
});
