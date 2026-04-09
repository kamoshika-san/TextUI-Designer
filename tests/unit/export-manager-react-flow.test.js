const assert = require('assert');
const path = require('path');
const { ExportManager } = require('../../out/exporters/export-manager');

describe('ExportManager react-flow support', () => {
  it('registers react-flow as a supported built-in format', () => {
    const manager = new ExportManager();
    assert.ok(manager.getSupportedFormats().includes('react-flow'));
    assert.strictEqual(manager.getFileExtension('react-flow'), '.tsx');
  });

  it('exports a navigation flow file through the react-flow format', async () => {
    const manager = new ExportManager();
    const samplePath = path.resolve(__dirname, '../../sample/12-navigation/app.tui.flow.yml');

    const output = await manager.exportFromFile(samplePath, {
      format: 'react-flow',
      sourcePath: samplePath
    });

    assert.ok(output.includes('createBrowserRouter'));
    assert.ok(output.includes("path: '/screens/shipping'"));
    assert.ok(output.includes('Checkout Flow'));
  });
});
