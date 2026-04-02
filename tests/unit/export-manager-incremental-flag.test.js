const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('ExportManager incremental diff route flag', () => {
  let ExportManager;

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

    manager.optimizingExecutor.runOptimizedExport = async () => {
      optimizedCalls += 1;
      return 'optimized';
    };
    manager.exportWithDiffUpdate = async () => {
      diffCalls += 1;
      return { result: 'diff', isFullUpdate: true, changedComponents: [0] };
    };

    try {
      const first = await manager.exportFromFile(filePath, { format: 'html', enableIncrementalDiffRoute: false });
      const second = await manager.exportFromFile(filePath, { format: 'html', enableIncrementalDiffRoute: false });

      assert.strictEqual(first, 'optimized');
      assert.strictEqual(second, 'optimized');
      assert.strictEqual(optimizedCalls, 2);
      assert.strictEqual(diffCalls, 0);
    } finally {
      manager.dispose();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('routes through exportWithDiffUpdate when the flag is ON and a previous snapshot exists', async () => {
    const manager = new ExportManager();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-export-'));
    const filePath = path.join(tempDir, 'sample.tui.yml');
    let optimizedCalls = 0;
    let diffCalls = 0;
    let lastTargets = [];

    writeDsl(filePath, 'First');

    manager.optimizingExecutor.runOptimizedExport = async () => {
      optimizedCalls += 1;
      return 'optimized';
    };
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
    } finally {
      manager.dispose();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('keeps the legacy route for cross-file exports even when the flag is ON', async () => {
    const manager = new ExportManager();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-export-'));
    const fileA = path.join(tempDir, 'a.tui.yml');
    const fileB = path.join(tempDir, 'b.tui.yml');
    let optimizedCalls = 0;
    let diffCalls = 0;

    writeDsl(fileA, 'First-A');
    writeDsl(fileB, 'First-B');

    manager.optimizingExecutor.runOptimizedExport = async () => {
      optimizedCalls += 1;
      return 'optimized';
    };
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
});
