const assert = require('assert');
const { VueExporter } = require('../../out/exporters/vue-exporter');
const {
  loadSample,
  assertRepresentativeMarkup
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

  it('is deterministic for repeated exports of the same DSL input', async () => {
    const dsl = loadSample('sample/01-basic/sample.tui.yml');

    const first = await exporter.export(dsl, { format: 'vue' });
    const second = await exporter.export(dsl, { format: 'vue' });

    assert.strictEqual(second, first);
  });
});
