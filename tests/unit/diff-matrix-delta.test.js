'use strict';

const assert = require('assert');
require('ts-node/register/transpile-only');

const matrixDelta = require('../../scripts/diff-matrix-delta.ts');

describe('diff matrix delta (M2-3)', () => {
  it('reports zero delta when baseline matches current snapshot', () => {
    const baseline = matrixDelta.buildCurrentMatrixSnapshot();
    const current = matrixDelta.buildCurrentMatrixSnapshot();
    const report = matrixDelta.buildDeltaReport(baseline, current);

    assert.strictEqual(report.summary.missingFromCurrentCount, 0);
    assert.strictEqual(report.summary.addedInCurrentCount, 0);
    assert.strictEqual(report.summary.outcomeDeltaCount, 0);
    assert.match(matrixDelta.renderMarkdownReport(report), /No outcome delta\./);
  });

  it('reports missing fixture coverage when current snapshot drops a baseline id', () => {
    const baseline = matrixDelta.buildCurrentMatrixSnapshot();
    const current = {
      kind: baseline.kind,
      fixtures: baseline.fixtures.filter((fixture) => fixture.fixtureId !== 'HH-FZ01'),
    };

    const report = matrixDelta.buildDeltaReport(baseline, current);

    assert.deepStrictEqual(report.coverage.missingFromCurrent, ['HH-FZ01']);
    assert.strictEqual(report.summary.missingFromCurrentCount, 1);
    assert.strictEqual(report.coverage.familyCounts.baseline['HH-FZ'], 6);
    assert.strictEqual(report.coverage.familyCounts.current['HH-FZ'], 5);
  });

  it('reports outcome delta when a fixture flips from accept to fallback', () => {
    const baseline = matrixDelta.buildCurrentMatrixSnapshot();
    const current = {
      kind: baseline.kind,
      fixtures: baseline.fixtures.map((fixture) => {
        if (fixture.fixtureId !== 'HH-N1') {
          return fixture;
        }
        return {
          ...fixture,
          outcome: 'fallback',
        };
      }),
    };

    const report = matrixDelta.buildDeltaReport(baseline, current);

    assert.strictEqual(report.summary.outcomeDeltaCount, 1);
    assert.deepStrictEqual(report.outcomeDelta, [{
      fixtureId: 'HH-N1',
      description: 'Alias collapse rescue',
      baselineOutcome: 'accept',
      currentOutcome: 'fallback',
    }]);
    assert.match(matrixDelta.renderCliSummary(report), /HH-N1:accept->fallback/);
  });
});
