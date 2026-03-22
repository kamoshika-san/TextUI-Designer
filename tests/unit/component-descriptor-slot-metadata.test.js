const assert = require('assert');
const { COMPONENT_DEFINITIONS } = require('../../out/components/definitions/component-definitions');
const { slotIdToTuiCssVarName } = require('../../out/components/definitions/token-style-property-map');

describe('component descriptor defaultTokenSlot (T-20260322-201)', () => {
  it('Text exposes defaultTokenSlot text.color as slot formatter entry', () => {
    const text = COMPONENT_DEFINITIONS.find(d => d.name === 'Text');
    assert.ok(text);
    assert.strictEqual(text.defaultTokenSlot, 'text.color');
  });

  it('Container exposes defaultTokenSlot container.background (T-203 preview/export vocabulary)', () => {
    const c = COMPONENT_DEFINITIONS.find(d => d.name === 'Container');
    assert.ok(c);
    assert.strictEqual(c.defaultTokenSlot, 'container.background');
  });

  it('slotIdToTuiCssVarName maps text.color to --tui-slot-text-color', () => {
    assert.strictEqual(slotIdToTuiCssVarName('text.color'), '--tui-slot-text-color');
  });
});
