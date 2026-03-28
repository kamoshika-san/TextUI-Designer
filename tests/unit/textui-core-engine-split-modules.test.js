const assert = require('assert');

const { TextUiCoreComponentBuilder } = require('../../out/core/textui-core-component-builder');
const diff = require('../../out/core/textui-core-diff');
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

  it('diff module builds compare documents and skeleton result', () => {
    const previous = diff.createNormalizedDiffDocument({
      page: { id: 'before', title: 'Before', layout: 'vertical', components: [] }
    }, { side: 'previous' });
    const next = diff.createNormalizedDiffDocument({
      page: { id: 'after', title: 'After', layout: 'vertical', components: [] }
    }, { side: 'next' });
    const result = diff.createDiffResultSkeleton(previous, next);

    assert.strictEqual(previous.metadata.normalizationState, 'normalized-dsl');
    assert.strictEqual(next.page.componentCount, 0);
    assert.strictEqual(result.metadata.entityCount, 1);
    assert.strictEqual(result.events.length, 1);
    assert.strictEqual(result.events[0].trace.pairingReason, 'pending');
    assert.strictEqual(result.entityResults[0].previous.path, '/page');
    assert.strictEqual(result.entityResults[0].next.path, '/page');
  });
});

