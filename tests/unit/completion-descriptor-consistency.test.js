const assert = require('assert');

/**
 * T-20260321-030: completion カタログが descriptor graph から導出されていることの不変条件。
 * getComponentCompletions の順序は T-032（schema-completion-engine.test.js）側。
 */
describe('Completion catalog vs COMPONENT_DEFINITIONS', () => {
  const { COMPONENT_DEFINITIONS } = require('../../out/components/definitions/component-definitions');
  const { COMPONENT_DESCRIPTIONS, COMPONENT_PROPERTIES } = require('../../out/services/completion-component-catalog');

  it('COMPONENT_DESCRIPTIONS のキー集合が descriptor の name 列と一致する', () => {
    const fromDef = COMPONENT_DEFINITIONS.map(d => d.name).sort();
    const fromDesc = Object.keys(COMPONENT_DESCRIPTIONS).sort();
    assert.deepStrictEqual(fromDesc, fromDef);
  });

  it('各コンポーネントの説明が descriptor の description と一致する', () => {
    for (const def of COMPONENT_DEFINITIONS) {
      assert.strictEqual(COMPONENT_DESCRIPTIONS[def.name], def.description);
    }
  });

  it('COMPONENT_PROPERTIES のキー集合が descriptor の name 列と一致する', () => {
    const fromDef = COMPONENT_DEFINITIONS.map(d => d.name).sort();
    const fromProps = Object.keys(COMPONENT_PROPERTIES).sort();
    assert.deepStrictEqual(fromProps, fromDef);
  });
});
