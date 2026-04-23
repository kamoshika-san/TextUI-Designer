const assert = require('assert');

const { ExportRoutePolicy } = require('../../out/exporters/export-route-policy');
const { ExportSnapshotState } = require('../../out/exporters/export-snapshot-state');

describe('ExportRoutePolicy', () => {
  function createDsl(title) {
    return {
      page: {
        id: 'page-1',
        title,
        layout: 'vertical',
        components: [
          {
            Text: {
              id: 'headline',
              text: title
            }
          }
        ]
      }
    };
  }

  it('does not attempt incremental route when no previous snapshot exists', () => {
    const state = new ExportSnapshotState();
    const policy = new ExportRoutePolicy(state);
    const nextDsl = createDsl('next');

    const decision = policy.decideIncrementalRoute(nextDsl, {
      format: 'html',
      sourcePath: '/tmp/sample.tui.yml',
      enableIncrementalDiffRoute: true
    });

    assert.strictEqual(decision.shouldAttempt, false);
    assert.strictEqual(decision.downgradeReason, undefined);
  });

  it('builds resolved render targets when incremental route is available', () => {
    const state = new ExportSnapshotState();
    const policy = new ExportRoutePolicy(state);
    const sourcePath = '/tmp/sample.tui.yml';
    const previousDsl = createDsl('before');
    const nextDsl = createDsl('after');

    state.rememberSnapshot(sourcePath, previousDsl);
    const decision = policy.decideIncrementalRoute(nextDsl, {
      format: 'html',
      sourcePath,
      enableIncrementalDiffRoute: true
    });

    assert.strictEqual(decision.shouldAttempt, true);
    assert.ok(Array.isArray(decision.renderTargets));
    assert.ok(decision.renderTargets.length > 0);
    assert.ok(decision.renderTargets.some(target => target.scope === 'page'));
    assert.ok(decision.renderTargets.every(target => target.resolution === 'resolved'));
  });

  it('returns downgrade reason when render targets are empty', () => {
    const state = new ExportSnapshotState();
    const policy = new ExportRoutePolicy(state);
    const sourcePath = '/tmp/sample.tui.yml';
    const sameDsl = createDsl('same');
    state.rememberSnapshot(sourcePath, sameDsl);

    const decision = policy.decideIncrementalRoute(sameDsl, {
      format: 'html',
      sourcePath,
      enableIncrementalDiffRoute: true
    });

    assert.strictEqual(decision.shouldAttempt, false);
    assert.strictEqual(decision.downgradeReason, 'empty-render-targets');
  });
});
