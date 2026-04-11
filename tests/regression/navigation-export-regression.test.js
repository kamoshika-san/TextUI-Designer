const assert = require('assert');
const path = require('path');
const { ExportManager } = require('../../out/exporters/export-manager');

describe('navigation export regression', () => {
  const samplePath = path.resolve(__dirname, '../../sample/12-navigation/app.tui.flow.yml');
  const v2SamplePath = path.resolve(__dirname, '../../sample/13-enterprise-flow/app.tui.flow.yml');

  it('exports the navigation sample across all built-in flow formats', async () => {
    const manager = new ExportManager();
    const formats = ['react-flow', 'vue-flow', 'svelte-flow', 'html-flow'];

    for (const format of formats) {
      const output = await manager.exportFromFile(samplePath, {
        format,
        sourcePath: samplePath
      });

      assert.ok(output.length > 0, `${format} should emit an artifact`);
      assert.match(output, /shipping/);
    }
  });

  it('preserves v2 graph metadata across all built-in flow formats', async () => {
    const manager = new ExportManager();
    const formats = ['react-flow', 'vue-flow', 'svelte-flow', 'html-flow'];

    for (const format of formats) {
      const output = await manager.exportFromFile(v2SamplePath, {
        format,
        sourcePath: v2SamplePath
      });

      assert.ok(output.length > 0, `${format} should emit an artifact`);
      assert.match(output, /t-approval-provisioning/);
      assert.match(output, /Terminal Kind: success/);
    }
  });
});
