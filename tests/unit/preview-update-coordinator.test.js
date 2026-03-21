const assert = require('assert');

describe('PreviewUpdateCoordinator', () => {
  it('beginPipeline で scheduled、endPipeline で idle', () => {
    const {
      PreviewUpdateCoordinator,
      PreviewUpdatePhase
    } = require('../../out/services/webview/preview-update-coordinator');
    const c = new PreviewUpdateCoordinator();
    assert.strictEqual(c.getPhase(), PreviewUpdatePhase.Idle);
    c.beginPipeline();
    assert.strictEqual(c.getPhase(), PreviewUpdatePhase.Scheduled);
    c.endPipeline();
    assert.strictEqual(c.getPhase(), PreviewUpdatePhase.Idle);
  });

  it('markFailed で failed のあと endPipeline で idle', () => {
    const {
      PreviewUpdateCoordinator,
      PreviewUpdatePhase
    } = require('../../out/services/webview/preview-update-coordinator');
    const c = new PreviewUpdateCoordinator();
    c.beginPipeline();
    c.markFailed();
    assert.strictEqual(c.getPhase(), PreviewUpdatePhase.Failed);
    c.endPipeline();
    assert.strictEqual(c.getPhase(), PreviewUpdatePhase.Idle);
  });
});
