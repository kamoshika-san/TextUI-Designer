const assert = require('assert');
const { VueExporter } = require('../../out/exporters/vue-exporter');
const {
  loadSample,
  assertRepresentativeMarkup,
  exportPrimaryHtmlSample,
  assertPrimaryLaneCompatibility
} = require('./helpers/framework-exporter-test-utils');

describe('VueExporter', () => {
  const exporter = new VueExporter();

  it('emits the normalized top-level section order fixed by the acceptance contract', async () => {
    const dsl = loadSample('sample/01-basic/sample.tui.yml');

    const output = await exporter.export(dsl, { format: 'vue' });

    assert.match(
      output,
      /^<template>[\s\S]*<\/template>\n\n<script setup lang="ts">[\s\S]*<\/script>\n\n<style scoped>[\s\S]*<\/style>\n$/
    );
  });

  it('preserves representative text, classes, and nested structure inside the template markup', async () => {
    const dsl = loadSample('sample/01-basic/sample.tui.yml');

    const output = await exporter.export(dsl, { format: 'vue' });

    assertRepresentativeMarkup(output, 'main');
  });

  it('documents reserved script-side extension points for future props, derived state, and events', async () => {
    const dsl = loadSample('sample/01-basic/sample.tui.yml');

    const output = await exporter.export(dsl, { format: 'vue' });

    assert.match(output, /Reserved extension points for future framework-aware generation\./);
    assert.match(output, /Props: Future props should land here through `defineProps`\./);
    assert.match(output, /Derived state: Future derived state should stay in the script setup block via refs\/computed helpers\./);
    assert.match(output, /Events: Future events should land here through `defineEmits` without changing template structure by default\./);
  });

  it('keeps primary-lane visible semantics and semantic class hooks for the representative sample', async () => {
    const { dsl, html } = await exportPrimaryHtmlSample('sample/01-basic/sample.tui.yml');

    const output = await exporter.export(dsl, { format: 'vue' });

    assertPrimaryLaneCompatibility(output, html);
  });

  it('is deterministic for repeated exports of the same DSL input', async () => {
    const dsl = loadSample('sample/01-basic/sample.tui.yml');

    const first = await exporter.export(dsl, { format: 'vue' });
    const second = await exporter.export(dsl, { format: 'vue' });

    assert.strictEqual(second, first);
  });
});
