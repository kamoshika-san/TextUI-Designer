const assert = require('assert');
const path = require('path');
const { ExportManager } = require('../../out/exporters/export-manager');

describe('ExportManager flow multi-framework support', () => {
  it('registers vue-flow, svelte-flow, and html-flow formats', () => {
    const manager = new ExportManager();
    const formats = manager.getSupportedFormats();
    assert.ok(formats.includes('vue-flow'));
    assert.ok(formats.includes('svelte-flow'));
    assert.ok(formats.includes('html-flow'));
  });

  it('exports the navigation sample through html-flow', async () => {
    const manager = new ExportManager();
    const samplePath = path.resolve(__dirname, '../../sample/12-navigation/app.tui.flow.yml');
    const output = await manager.exportFromFile(samplePath, { format: 'html-flow', sourcePath: samplePath });

    assert.ok(output.includes('sitemap.xml'));
    assert.ok(output.includes('/screens/shipping'));
  });
});
