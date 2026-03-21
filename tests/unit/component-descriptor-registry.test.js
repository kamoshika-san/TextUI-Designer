const assert = require('assert');

describe('ComponentDescriptorRegistry', () => {
  const { componentDescriptorRegistry } = require('../../out/registry/component-descriptor-registry');
  const { COMPONENT_DEFINITIONS } = require('../../out/components/definitions/component-definitions');

  it('list/get/getSchemaRefs が descriptor graph と整合する', () => {
    const listed = componentDescriptorRegistry.list();
    assert.deepStrictEqual(listed, COMPONENT_DEFINITIONS);

    const first = COMPONENT_DEFINITIONS[0];
    assert.ok(first, 'COMPONENT_DEFINITIONS が空です');
    assert.deepStrictEqual(componentDescriptorRegistry.get(first.name), first);

    const schemaRefs = COMPONENT_DEFINITIONS.map(def => def.schemaRef);
    assert.deepStrictEqual(componentDescriptorRegistry.getSchemaRefs(), schemaRefs);
  });

  it('preview/exporter キー取得APIが定義に一致する', () => {
    for (const def of COMPONENT_DEFINITIONS) {
      assert.strictEqual(
        componentDescriptorRegistry.getPreviewRenderer(def.name),
        def.previewRendererKey
      );
      assert.strictEqual(
        componentDescriptorRegistry.getExporterHandlerKey(def.name),
        def.exporterRendererMethod
      );
    }
  });
});
