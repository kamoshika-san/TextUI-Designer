const assert = require('assert');

describe('Exporter capability contract (EXPORTER-FA-001)', () => {
  const {
    BUILT_IN_COMPONENT_EXPORTER_IDS,
    BUILT_IN_EXPORTER_CAPABILITIES,
    BUILT_IN_EXPORTER_RENDERER_DEFINITIONS,
    getBuiltInExporterCapability
  } = require('../../out/components/definitions/exporter-renderer-definitions');
  const { BUILT_IN_COMPONENTS } = require('../../out/components/definitions/built-in-components');
  const definitionsIndex = require('../../out/components/definitions');

  it('is exported from the component definitions src entrypoint', () => {
    assert.strictEqual(
      definitionsIndex.BUILT_IN_EXPORTER_CAPABILITIES,
      BUILT_IN_EXPORTER_CAPABILITIES
    );
    assert.strictEqual(
      definitionsIndex.getBuiltInExporterCapability,
      getBuiltInExporterCapability
    );
  });

  it('declares one capability per built-in exporter and component', () => {
    for (const exporter of BUILT_IN_COMPONENT_EXPORTER_IDS) {
      const capabilities = BUILT_IN_EXPORTER_CAPABILITIES[exporter];
      assert.ok(capabilities, `[capability] missing exporter "${exporter}"`);
      assert.deepStrictEqual(Object.keys(capabilities).sort(), [...BUILT_IN_COMPONENTS].sort());

      for (const component of BUILT_IN_COMPONENTS) {
        const capability = capabilities[component];
        assert.deepStrictEqual(
          capability,
          getBuiltInExporterCapability(exporter, component),
          `[capability] ${exporter}/${component} helper mismatch`
        );
        assert.strictEqual(capability.exporter, exporter);
        assert.strictEqual(capability.component, component);
        assert.ok(
          ['native', 'static', 'unsupported'].includes(capability.support),
          `[capability] invalid support "${capability.support}" for ${exporter}/${component}`
        );
      }
    }
  });

  it('keeps React/Pug source-exporter capabilities tied to the existing renderer definitions only', () => {
    for (const exporter of ['react', 'pug']) {
      for (const component of BUILT_IN_COMPONENTS) {
        const capability = getBuiltInExporterCapability(exporter, component);
        assert.strictEqual(capability.support, 'native');
        assert.strictEqual(
          capability.rendererMethod,
          BUILT_IN_EXPORTER_RENDERER_DEFINITIONS[component].rendererMethod,
          `[capability] ${exporter}/${component} rendererMethod drift`
        );
      }
    }
  });

  it('marks static and unsupported lanes without adding legacy renderer-method coupling', () => {
    for (const component of BUILT_IN_COMPONENTS) {
      assert.strictEqual(getBuiltInExporterCapability('html', component).support, 'static');
      assert.strictEqual(getBuiltInExporterCapability('html', component).rendererMethod, undefined);

      for (const exporter of ['react-flow', 'vue-flow', 'svelte-flow', 'html-flow']) {
        const capability = getBuiltInExporterCapability(exporter, component);
        assert.strictEqual(capability.support, 'unsupported');
        assert.strictEqual(capability.rendererMethod, undefined);
      }
    }
  });
});
