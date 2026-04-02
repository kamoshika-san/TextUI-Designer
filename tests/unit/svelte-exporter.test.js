const assert = require('assert');
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const { SvelteExporter } = require('../../out/exporters/svelte-exporter');

describe('SvelteExporter', () => {
  const repoRoot = path.resolve(__dirname, '../..');
  const exporter = new SvelteExporter();

  function loadSample(relativePath) {
    const absolutePath = path.join(repoRoot, relativePath);
    return yaml.parse(fs.readFileSync(absolutePath, 'utf8'));
  }

  it('emits the normalized top-level section order fixed by the acceptance contract', async () => {
    const dsl = loadSample('sample/01-basic/sample.tui.yml');

    const output = await exporter.export(dsl, { format: 'svelte' });

    assert.match(
      output,
      /^<script lang="ts">[\s\S]*<\/script>\n\n<main class="textui-generated">[\s\S]*<\/main>\n\n<style>[\s\S]*<\/style>\n$/
    );
  });

  it('preserves representative text, classes, and nested structure inside the main markup', async () => {
    const dsl = loadSample('sample/01-basic/sample.tui.yml');

    const output = await exporter.export(dsl, { format: 'svelte' });

    assert.match(output, /<main class="textui-generated">/);
    assert.match(output, /TextUI Designer - All Components/);
    assert.match(output, /class="[^"]*textui-progress[^"]*"/);
    assert.match(output, /Overview Tab/);
    assert.match(output, /<table[\s\S]*Alice[\s\S]*Admin[\s\S]*<\/table>/);
  });

  it('is deterministic for repeated exports of the same DSL input', async () => {
    const dsl = loadSample('sample/01-basic/sample.tui.yml');

    const first = await exporter.export(dsl, { format: 'svelte' });
    const second = await exporter.export(dsl, { format: 'svelte' });

    assert.strictEqual(second, first);
  });
});
