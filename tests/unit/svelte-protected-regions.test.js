const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { SvelteExporter } = require('../../out/exporters/svelte-exporter');

describe('SvelteExporter Protected Regions PoC', () => {
  const tmpDir = path.resolve(__dirname, '../../.tmp-test-protected');
  const outputPath = path.join(tmpDir, 'test.svelte');
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

  it('inserts default protected region placeholder when file is new', async () => {
    const exporter = new SvelteExporter();
    const output = await exporter.export(dsl, { format: 'svelte', outputPath });

    assert.match(output, /\/\/ \[TUI_USER_LOGIC_START\]/);
    assert.match(output, /\/\/ Add your custom logic here/);
    assert.match(output, /\/\/ \[TUI_USER_LOGIC_END\]/);
  });

  it('preserves existing user logic between markers during re-export', async () => {
    const exporter = new SvelteExporter();

    // 1. Initial export
    const initialOutput = await exporter.export(dsl, { format: 'svelte', outputPath });
    fs.writeFileSync(outputPath, initialOutput, 'utf8');

    // 2. User adds custom logic
    const content = fs.readFileSync(outputPath, 'utf8');
    const modified = content.replace(
      '// Add your custom logic here (it will be preserved on re-export)',
      'const myVar = "hello";'
    );
    fs.writeFileSync(outputPath, modified, 'utf8');

    // 3. Re-export
    const output = await exporter.export(dsl, { format: 'svelte', outputPath });

    assert.match(output, /const myVar = "hello";/);
    assert.doesNotMatch(output, /\/\/ Add your custom logic here/);
  });
});
