const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const YAML = require('yaml');

const {
  buildDenseSiblingScenario,
  buildNestedDashboardScenario,
  countScenarioComponents
} = require('../fixtures/incremental-rendering/benchmark-scenarios');

describe('ExportManager incremental benchmark scenarios', () => {
  let ExportManager;

  before(() => {
    ({ ExportManager } = require('../../out/exporters'));
  });

  function writeDsl(filePath, dsl) {
    fs.writeFileSync(filePath, YAML.stringify(dsl), 'utf8');
  }

  it('exercises the incremental route on a nested 100+ component dashboard across repeated passes', async () => {
    const manager = new ExportManager();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-ir-benchmark-'));
    const filePath = path.join(tempDir, 'nested-dashboard.tui.yml');
    const baseDsl = buildNestedDashboardScenario('base');
    const updateA = buildNestedDashboardScenario('update-a');
    const updateB = buildNestedDashboardScenario('update-b');
    const capturedTargets = [];

    assert.ok(countScenarioComponents(baseDsl) >= 100);

    manager.optimizingExecutor.runOptimizedExport = async dsl => `optimized:${dsl.page.title}`;
    manager.exportWithDiffUpdate = async (dsl, options) => {
      capturedTargets.push(options.incrementalRenderTargets || []);
      return {
        result: `diff:${dsl.page.title}`,
        isFullUpdate: false,
        changedComponents: [0]
      };
    };

    try {
      writeDsl(filePath, baseDsl);
      const first = await manager.exportFromFile(filePath, { format: 'html', enableIncrementalDiffRoute: true });

      writeDsl(filePath, updateA);
      const second = await manager.exportFromFile(filePath, { format: 'html', enableIncrementalDiffRoute: true });

      writeDsl(filePath, updateB);
      const third = await manager.exportFromFile(filePath, { format: 'html', enableIncrementalDiffRoute: true });

      assert.match(first, /^optimized:/);
      assert.match(second, /^diff:/);
      assert.match(third, /^diff:/);
      assert.strictEqual(capturedTargets.length, 2);
      capturedTargets.forEach(targets => {
        assert.ok(targets.length >= 3);
        assert.ok(targets.every(target => target.resolution === 'resolved'));
        assert.ok(targets.some(target => target.scope === 'page'));
        assert.ok(targets.some(target => target.entityKey.includes('hero-title')));
        assert.ok(targets.some(target => target.entityKey.includes('card-0-title')));
      });
      assert.strictEqual(manager.lastIncrementalDowngradeReason, null);
    } finally {
      manager.dispose();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('exercises adjacent sibling-heavy benchmark scenarios without downgrading the incremental route', async () => {
    const manager = new ExportManager();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-ir-benchmark-'));
    const filePath = path.join(tempDir, 'dense-siblings.tui.yml');
    const baseDsl = buildDenseSiblingScenario('base');
    const updateDsl = buildDenseSiblingScenario('update');
    let capturedTargets = [];

    assert.ok(countScenarioComponents(baseDsl) >= 100);

    manager.optimizingExecutor.runOptimizedExport = async dsl => `optimized:${dsl.page.title}`;
    manager.exportWithDiffUpdate = async (dsl, options) => {
      capturedTargets = options.incrementalRenderTargets || [];
      return {
        result: `diff:${dsl.page.title}`,
        isFullUpdate: false,
        changedComponents: [0]
      };
    };

    try {
      writeDsl(filePath, baseDsl);
      await manager.exportFromFile(filePath, { format: 'html', enableIncrementalDiffRoute: true });

      writeDsl(filePath, updateDsl);
      const second = await manager.exportFromFile(filePath, { format: 'html', enableIncrementalDiffRoute: true });

      assert.match(second, /^diff:/);
      assert.ok(capturedTargets.length >= 2);
      assert.ok(capturedTargets.every(target => target.resolution === 'resolved'));
      assert.ok(capturedTargets.some(target => target.entityKey.includes('row-1-button')));
      assert.ok(capturedTargets.some(target => target.entityKey.includes('row-2-headline')));
      assert.strictEqual(manager.lastIncrementalDowngradeReason, null);
    } finally {
      manager.dispose();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
