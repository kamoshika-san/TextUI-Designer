const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { SvelteExporter } = require('../../out/exporters/svelte-exporter');
const { VueExporter } = require('../../out/exporters/vue-exporter');

describe('Framework Exporters Protected Regions', () => {
  const tmpDir = path.resolve(__dirname, '../../.tmp-test-protected-all');
  const dsl = {
    page: {
      id: 'test',
      title: 'Test',
      layout: 'vertical',
      components: []
    }
  };

  beforeEach(() => {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('SvelteExporter preserves user logic', async () => {
    const outputPath = path.join(tmpDir, 'test.svelte');
    const exporter = new SvelteExporter();

    // 1. Initial export
    const initial = await exporter.export(dsl, { format: 'svelte', outputPath });
    fs.writeFileSync(outputPath, initial, 'utf8');

    // 2. Add logic
    const modified = initial.replace(
      '// Add your custom logic here (it will be preserved on re-export)',
      'const a = 1;'
    );
    fs.writeFileSync(outputPath, modified, 'utf8');

    // 3. Re-export
    const reexported = await exporter.export(dsl, { format: 'svelte', outputPath });
    assert.match(reexported, /const a = 1;/);
  });

  it('VueExporter preserves user logic', async () => {
    const outputPath = path.join(tmpDir, 'test.vue');
    const exporter = new VueExporter();

    // 1. Initial export
    const initial = await exporter.export(dsl, { format: 'vue', outputPath });
    fs.writeFileSync(outputPath, initial, 'utf8');

    // 2. Add logic
    const modified = initial.replace(
      '// Add your custom logic here (it will be preserved on re-export)',
      'const b = 2;'
    );
    fs.writeFileSync(outputPath, modified, 'utf8');

    // 3. Re-export
    const reexported = await exporter.export(dsl, { format: 'vue', outputPath });
    assert.match(reexported, /const b = 2;/);
  });

  it('ReactExporter preserves user logic', async () => {
    const { ReactExporter } = require('../../out/exporters/react-exporter');
    const outputPath = path.join(tmpDir, 'test.tsx');
    const exporter = new ReactExporter();

    // 1. Initial export
    const initial = await exporter.export(dsl, { format: 'react', outputPath });
    fs.writeFileSync(outputPath, initial, 'utf8');

    // 2. Add logic
    const modified = initial.replace(
      '// Add your custom logic here (it will be preserved on re-export)',
      'const c = 3;'
    );
    fs.writeFileSync(outputPath, modified, 'utf8');

    // 3. Re-export
    const reexported = await exporter.export(dsl, { format: 'react', outputPath });
    assert.match(reexported, /const c = 3;/);
  });
});
