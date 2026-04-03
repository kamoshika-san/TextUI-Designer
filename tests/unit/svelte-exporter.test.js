const assert = require('assert');
const { SvelteExporter } = require('../../out/exporters/svelte-exporter');
const {
  loadSample,
  assertRepresentativeMarkup,
  exportPrimaryHtmlSample,
  assertPrimaryLaneCompatibility
} = require('./helpers/framework-exporter-test-utils');

describe('SvelteExporter', () => {
  const exporter = new SvelteExporter();

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

    assertRepresentativeMarkup(output, 'main');
  });

  it('documents reserved script-side extension points for future props, derived state, and events', async () => {
    const dsl = loadSample('sample/01-basic/sample.tui.yml');

    const output = await exporter.export(dsl, { format: 'svelte' });

    assert.match(output, /Reserved extension points for future framework-aware generation\./);
    assert.match(output, /Props: Future props should land here as `export let` declarations\./);
    assert.match(output, /Derived state: Future derived state should stay in the script block as reactive declarations\/helpers\./);
    assert.match(output, /Events: Future events should stay dispatcher-based so the static markup contract remains intact\./);
  });

  it('keeps primary-lane visible semantics and semantic class hooks for the representative sample', async () => {
    const { dsl, html } = await exportPrimaryHtmlSample('sample/01-basic/sample.tui.yml');

    const output = await exporter.export(dsl, { format: 'svelte' });

    assertPrimaryLaneCompatibility(output, html);
  });

  it('is deterministic for repeated exports of the same DSL input', async () => {
    const dsl = loadSample('sample/01-basic/sample.tui.yml');

    const first = await exporter.export(dsl, { format: 'svelte' });
    const second = await exporter.export(dsl, { format: 'svelte' });

    assert.strictEqual(second, first);
  });
});
