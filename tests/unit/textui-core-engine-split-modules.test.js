const assert = require('assert');

const { TextUiCoreComponentBuilder } = require('../../out/core/textui-core-component-builder');
const domain = require('../../out/core/textui-core-engine-domain');
const format = require('../../out/core/textui-core-engine-format');
const io = require('../../out/core/textui-core-engine-io');

describe('TextUICoreEngine split modules', () => {
  it('buildGenerateUiDsl sets default page id/layout and builds components', () => {
    const builder = new TextUiCoreComponentBuilder();

    const dsl = domain.buildGenerateUiDsl({ title: 'Hello World' }, builder);
    assert.strictEqual(dsl.page.id, 'hello-world');
    assert.strictEqual(dsl.page.layout, 'vertical');
    assert.ok(Array.isArray(dsl.page.components));
    assert.deepStrictEqual(dsl.page.components, []);
  });

  it('buildExplainErrorResponseDomain returns empty summary when no diagnostics', () => {
    const result = domain.buildExplainErrorResponseDomain({ diagnostics: [] });
    assert.strictEqual(result.summary, 'エラーはありません。');
    assert.deepStrictEqual(result.suggestions, []);
  });

  it('stringifyUiYaml serializes DSL into YAML', () => {
    const yaml = format.stringifyUiYaml({
      page: { id: 'x', title: 't', layout: 'vertical', components: [] }
    });
    assert.ok(yaml.includes('page:'));
  });

  it('previewSchemaValueIo can read schema fragments', async () => {
    const value = io.previewSchemaValueIo('main', '/properties/page');
    assert.ok(value);
    assert.strictEqual(typeof value, 'object');
  });

  it('getSupportedProvidersIo includes built-in provider names', async () => {
    const providers = await io.getSupportedProvidersIo();
    assert.ok(providers.includes('html'));
  });
});

