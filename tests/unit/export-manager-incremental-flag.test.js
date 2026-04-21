const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('ExportManager incremental diff route flag', () => {
  let ExportManager;
  const clearMonitor = manager => {
    if (manager.performanceMonitor && typeof manager.performanceMonitor.clear === 'function') {
      manager.performanceMonitor.clear();
    }
  };

  const writeDsl = (filePath, title) => {
    fs.writeFileSync(filePath, [
      'page:',
      "  id: page-1",
      `  title: ${title}`,
      '  layout: vertical',
      '  components:',
      '    - Text:',
      '        id: headline',
      `        text: ${title}`
    ].join('\n'));
  };

  const registerCountingHtmlExporter = (manager, handler) => {
    manager.registerExporter('html', {
      export: handler,
      getFileExtension: () => '.html'
    });
  };

  before(() => {
    ({ ExportManager } = require('../../out/exporters'));
  });

  it('keeps the existing optimized route when the flag is OFF', async () => {
    const manager = new ExportManager();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-export-'));
    const filePath = path.join(tempDir, 'sample.tui.yml');
    let optimizedCalls = 0;
    let diffCalls = 0;

    writeDsl(filePath, 'First');

    registerCountingHtmlExporter(manager, async () => {
      optimizedCalls += 1;
      return 'optimized';
    });
    manager.exportWithDiffUpdate = async () => {
      diffCalls += 1;
      return { result: 'diff', isFullUpdate: true, changedComponents: [0] };
    };

    try {
      const first = await manager.exportFromFile(filePath, { format: 'html', enableIncrementalDiffRoute: false });
      const second = await manager.exportFromFile(filePath, { format: 'html', enableIncrementalDiffRoute: false });

      assert.strictEqual(first, 'optimized');
      assert.strictEqual(second, 'optimized');
      assert.strictEqual(optimizedCalls, 1);
      assert.strictEqual(diffCalls, 0);
    } finally {
      manager.dispose();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('routes through exportWithDiffUpdate when the flag is ON and a previous snapshot exists', async () => {
    const manager = new ExportManager();
    clearMonitor(manager);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-export-'));
    const filePath = path.join(tempDir, 'sample.tui.yml');
    let optimizedCalls = 0;
    let diffCalls = 0;
    let lastTargets = [];

    writeDsl(filePath, 'First');

    registerCountingHtmlExporter(manager, async () => {
      optimizedCalls += 1;
      return 'optimized';
    });
    manager.exportWithDiffUpdate = async (dsl, options) => {
      diffCalls += 1;
      lastTargets = options.incrementalRenderTargets || [];
      return {
        result: `diff:${dsl.page.title}`,
        isFullUpdate: true,
        changedComponents: [0]
      };
    };

    try {
      const first = await manager.exportFromFile(filePath, { format: 'html', enableIncrementalDiffRoute: true });
      writeDsl(filePath, 'Second');
      const second = await manager.exportFromFile(filePath, { format: 'html', enableIncrementalDiffRoute: true });

      assert.strictEqual(first, 'optimized');
      assert.strictEqual(second, 'diff:Second');
      assert.strictEqual(optimizedCalls, 1);
      assert.strictEqual(diffCalls, 1);
      assert.ok(lastTargets.some(target => target.scope === 'page'));
      assert.ok(lastTargets.some(target => target.entityKey === 'component:Text:headline'));
      const stats = manager.getPerformanceStats().incrementalRouteMetrics;
      assert.strictEqual(stats.diffRoute.totalSamples, 1);
      assert.strictEqual(stats.diffRoute.successCount, 1);
      assert.strictEqual(stats.diffRoute.fallbackCount, 0);
      assert.strictEqual(stats.fullRender.totalSamples, 1);
      assert.strictEqual(stats.fullRender.directCount, 1);
      assert.strictEqual(stats.fullRender.fallbackCount, 0);
    } finally {
      manager.dispose();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('keeps the full-render route for cross-file exports even when the flag is ON', async () => {
    const manager = new ExportManager();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-export-'));
    const fileA = path.join(tempDir, 'a.tui.yml');
    const fileB = path.join(tempDir, 'b.tui.yml');
    let optimizedCalls = 0;
    let diffCalls = 0;

    writeDsl(fileA, 'First-A');
    writeDsl(fileB, 'First-B');

    registerCountingHtmlExporter(manager, async () => {
      optimizedCalls += 1;
      return 'optimized';
    });
    manager.exportWithDiffUpdate = async () => {
      diffCalls += 1;
      return { result: 'diff', isFullUpdate: true, changedComponents: [0] };
    };

    try {
      const first = await manager.exportFromFile(fileA, { format: 'html', enableIncrementalDiffRoute: true });
      const second = await manager.exportFromFile(fileB, { format: 'html', enableIncrementalDiffRoute: true });

      assert.strictEqual(first, 'optimized');
      assert.strictEqual(second, 'optimized');
      assert.strictEqual(optimizedCalls, 2);
      assert.strictEqual(diffCalls, 0);
    } finally {
      manager.dispose();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('auto-downgrades to the full render when exportWithDiffUpdate throws', async () => {
    const manager = new ExportManager();
    clearMonitor(manager);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-export-'));
    const filePath = path.join(tempDir, 'sample.tui.yml');
    let optimizedCalls = 0;
    let diffCalls = 0;

    writeDsl(filePath, 'First');

    registerCountingHtmlExporter(manager, async dsl => {
      optimizedCalls += 1;
      return `optimized:${dsl.page.title}`;
    });
    manager.exportWithDiffUpdate = async () => {
      diffCalls += 1;
      throw new Error('incremental apply mismatch');
    };

    try {
      const first = await manager.exportFromFile(filePath, { format: 'html', enableIncrementalDiffRoute: true });
      writeDsl(filePath, 'Second');
      const second = await manager.exportFromFile(filePath, { format: 'html', enableIncrementalDiffRoute: true });

      assert.strictEqual(first, 'optimized:First');
      assert.strictEqual(second, 'optimized:Second');
      assert.strictEqual(optimizedCalls, 2);
      assert.strictEqual(diffCalls, 1);
      assert.match(manager.lastIncrementalDowngradeReason || '', /incremental-route-error:/);
      const stats = manager.getPerformanceStats().incrementalRouteMetrics;
      assert.strictEqual(stats.diffRoute.totalSamples, 1);
      assert.strictEqual(stats.diffRoute.fallbackCount, 1);
      assert.strictEqual(stats.diffRoute.executionFailureCount, 1);
      assert.strictEqual(stats.diffRoute.failureRate, 1);
      assert.strictEqual(stats.fullRender.totalSamples, 2);
      assert.strictEqual(stats.fullRender.fallbackCount, 1);
      assert.strictEqual(stats.fallbackReasons['incremental-route-error: incremental apply mismatch'], 1);
    } finally {
      manager.dispose();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('auto-downgrades to the full render when exportWithDiffUpdate returns an invalid payload', async () => {
    const manager = new ExportManager();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-export-'));
    const filePath = path.join(tempDir, 'sample.tui.yml');
    let optimizedCalls = 0;

    writeDsl(filePath, 'First');

    registerCountingHtmlExporter(manager, async dsl => {
      optimizedCalls += 1;
      return `optimized:${dsl.page.title}`;
    });
    manager.exportWithDiffUpdate = async () => ({
      result: '',
      isFullUpdate: false,
      changedComponents: []
    });

    try {
      await manager.exportFromFile(filePath, { format: 'html', enableIncrementalDiffRoute: true });
      writeDsl(filePath, 'Second');
      const second = await manager.exportFromFile(filePath, { format: 'html', enableIncrementalDiffRoute: true });

      assert.strictEqual(second, 'optimized:Second');
      assert.strictEqual(optimizedCalls, 2);
      assert.match(manager.lastIncrementalDowngradeReason || '', /invalid-incremental-result/);
    } finally {
      manager.dispose();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
