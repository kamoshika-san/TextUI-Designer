const assert = require('assert');
const { SvelteExporter } = require('../../out/exporters/svelte-exporter');
const { VueExporter } = require('../../out/exporters/vue-exporter');

describe('Native Framework Exporters PoC', () => {
  const dsl = {
    page: {
      id: 'test',
      title: 'Test',
      layout: 'vertical',
      components: [
        { Button: { label: 'Click Me', kind: 'primary' } }
      ]
    }
  };

  it('SvelteExporter generates on:click when useNativeFrameworkRenderer is true', async () => {
    const exporter = new SvelteExporter();
    const output = await exporter.export(dsl, { format: 'svelte', useNativeFrameworkRenderer: true });

    assert.match(output, /on:click/);
    assert.match(output, /class="textui-button primary"/);
    assert.match(output, /Click Me/);
  });

  it('VueExporter generates @click when useNativeFrameworkRenderer is true', async () => {
    const exporter = new VueExporter();
    const output = await exporter.export(dsl, { format: 'vue', useNativeFrameworkRenderer: true });

    assert.match(output, /@click="\$emit\('click', \$event\)"/);
    assert.match(output, /class="textui-button primary"/);
    assert.match(output, /Click Me/);
  });

  it('Exporters generate native form elements by default', async () => {
    const formDsl = {
      page: {
        id: 'form',
        components: [
          {
            Form: {
              fields: [
                { Input: { label: 'Name', name: 'userName', placeholder: 'Enter name' } },
                { Checkbox: { label: 'Agreed', name: 'isAgreed' } }
              ]
            }
          }
        ]
      }
    };

    const svelteExporter = new SvelteExporter();
    const svelteOutput = await svelteExporter.export(formDsl, { format: 'svelte' });
    assert.match(svelteOutput, /bind:value={userName}/);
    assert.match(svelteOutput, /bind:checked={isAgreed}/);
    assert.match(svelteOutput, /class="textui-label">Name/);

    const vueExporter = new VueExporter();
    const vueOutput = await vueExporter.export(formDsl, { format: 'vue' });
    assert.match(vueOutput, /v-model="userName"/);
    assert.match(vueOutput, /v-model="isAgreed"/);
    assert.match(vueOutput, /class="textui-label">Name/);
  });
});
