/**
 * React / Vue / Svelte ProviderAdapter テスト
 */

const assert = require('assert');

const MINIMAL_DSL = {
  page: { id: 'test', title: 'Test', components: [] }
};

const MINIMAL_INPUT = { dsl: MINIMAL_DSL, options: {} };

describe('provider-adapters: ReactProviderAdapter', () => {
  let providerModule;

  before(() => {
    providerModule = require('../../out/integrations/provider');
  });

  it('has name "react"', () => {
    const adapter = new providerModule.ReactProviderAdapter();
    assert.strictEqual(adapter.name, 'react');
  });

  it('declares react-component capability', () => {
    const adapter = new providerModule.ReactProviderAdapter();
    assert.ok(adapter.capabilities.includes('react-component'));
  });

  it('export returns ExportArtifact with text/javascript mimeType', async () => {
    const adapter = new providerModule.ReactProviderAdapter();
    const artifact = await adapter.export(MINIMAL_INPUT);
    assert.strictEqual(artifact.mimeType, 'text/javascript');
    assert.ok(typeof artifact.content === 'string');
    assert.ok(artifact.content.length > 0);
  });

  it('export returns fileName index.jsx', async () => {
    const adapter = new providerModule.ReactProviderAdapter();
    const artifact = await adapter.export(MINIMAL_INPUT);
    assert.strictEqual(artifact.fileName, 'index.jsx');
  });
});

describe('provider-adapters: VueProviderAdapter', () => {
  let providerModule;

  before(() => {
    providerModule = require('../../out/integrations/provider');
  });

  it('has name "vue"', () => {
    const adapter = new providerModule.VueProviderAdapter();
    assert.strictEqual(adapter.name, 'vue');
  });

  it('declares vue-component capability', () => {
    const adapter = new providerModule.VueProviderAdapter();
    assert.ok(adapter.capabilities.includes('vue-component'));
  });

  it('export returns ExportArtifact with text/javascript mimeType', async () => {
    const adapter = new providerModule.VueProviderAdapter();
    const artifact = await adapter.export(MINIMAL_INPUT);
    assert.strictEqual(artifact.mimeType, 'text/javascript');
    assert.ok(typeof artifact.content === 'string');
  });

  it('export returns fileName index.vue', async () => {
    const adapter = new providerModule.VueProviderAdapter();
    const artifact = await adapter.export(MINIMAL_INPUT);
    assert.strictEqual(artifact.fileName, 'index.vue');
  });
});

describe('provider-adapters: SvelteProviderAdapter', () => {
  let providerModule;

  before(() => {
    providerModule = require('../../out/integrations/provider');
  });

  it('has name "svelte"', () => {
    const adapter = new providerModule.SvelteProviderAdapter();
    assert.strictEqual(adapter.name, 'svelte');
  });

  it('declares svelte-component capability', () => {
    const adapter = new providerModule.SvelteProviderAdapter();
    assert.ok(adapter.capabilities.includes('svelte-component'));
  });

  it('export returns ExportArtifact with text/javascript mimeType', async () => {
    const adapter = new providerModule.SvelteProviderAdapter();
    const artifact = await adapter.export(MINIMAL_INPUT);
    assert.strictEqual(artifact.mimeType, 'text/javascript');
    assert.ok(typeof artifact.content === 'string');
  });

  it('export returns fileName index.svelte', async () => {
    const adapter = new providerModule.SvelteProviderAdapter();
    const artifact = await adapter.export(MINIMAL_INPUT);
    assert.strictEqual(artifact.fileName, 'index.svelte');
  });
});

describe('provider-adapters: all adapters satisfy TextUIProvider contract', () => {
  let providerModule;

  before(() => {
    providerModule = require('../../out/integrations/provider');
  });

  const adapterClasses = ['ReactProviderAdapter', 'VueProviderAdapter', 'SvelteProviderAdapter'];

  adapterClasses.forEach(className => {
    it(`${className} has name, capabilities, and export()`, () => {
      const adapter = new providerModule[className]();
      assert.ok(typeof adapter.name === 'string');
      assert.ok(Array.isArray(adapter.capabilities));
      assert.ok(typeof adapter.export === 'function');
    });
  });
});
