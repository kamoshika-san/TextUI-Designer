const assert = require('assert');

const { clearWebViewComponentRegistry, getRegisteredWebViewComponents } = require('../../out/registry/webview-component-registry');
const { COMPONENT_DEFINITIONS } = require('../../out/components/definitions/component-definitions');
const { registerBuiltInComponents } = require('../../out/renderer/component-map');

describe('component-map preview registration', () => {
  it('登録順と件数が COMPONENT_DEFINITIONS と一致する', () => {
    clearWebViewComponentRegistry();
    registerBuiltInComponents();
    const expected = COMPONENT_DEFINITIONS.map(d => d.name);
    const actual = getRegisteredWebViewComponents();
    assert.deepStrictEqual(actual, expected);
  });
});
