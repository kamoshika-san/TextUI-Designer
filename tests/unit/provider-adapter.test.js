/**
 * Provider API アダプターテスト
 */

const assert = require('assert');

describe('provider-adapter: HtmlProviderAdapter', () => {
  let providerModule;

  before(() => {
    providerModule = require('../../out/integrations/provider');
  });

  it('HtmlProviderAdapter has name "html"', () => {
    const adapter = new providerModule.HtmlProviderAdapter();
    assert.strictEqual(adapter.name, 'html');
  });

  it('HtmlProviderAdapter declares html-static capability', () => {
    const adapter = new providerModule.HtmlProviderAdapter();
    assert.ok(adapter.capabilities.includes('html-static'));
  });

  it('HtmlProviderAdapter.export returns ExportArtifact with text/html mimeType', async () => {
    const adapter = new providerModule.HtmlProviderAdapter();
    const input = {
      dsl: {
        page: {
          id: 'test-page',
          title: 'Test',
          components: []
        }
      },
      options: {}
    };
    const artifact = await adapter.export(input);
    assert.strictEqual(artifact.mimeType, 'text/html');
    assert.ok(typeof artifact.content === 'string');
    assert.ok(artifact.content.length > 0);
  });

  it('HtmlProviderAdapter.export returns fileName index.html', async () => {
    const adapter = new providerModule.HtmlProviderAdapter();
    const artifact = await adapter.export({
      dsl: { page: { id: 'p', title: 'P', components: [] } },
      options: {}
    });
    assert.strictEqual(artifact.fileName, 'index.html');
  });
});

describe('provider-adapter: TextUIProvider interface contract', () => {
  let providerModule;

  before(() => {
    providerModule = require('../../out/integrations/provider');
  });

  it('HtmlProviderAdapter satisfies TextUIProvider contract (name, capabilities, export)', () => {
    const adapter = new providerModule.HtmlProviderAdapter();
    assert.ok(typeof adapter.name === 'string');
    assert.ok(Array.isArray(adapter.capabilities));
    assert.ok(typeof adapter.export === 'function');
  });
});
