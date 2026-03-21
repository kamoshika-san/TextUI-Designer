const assert = require('assert');

/**
 * T-20260321-016: `tokenStyleProperty` の単一参照（definitions）と React camelCase 変換の回帰ガード。
 * 先に `npm run compile` 済みであること。
 */
describe('token-style-property-map', () => {
  const {
    getTokenStylePropertyKebab,
    tokenStyleKebabToReactCamel
  } = require('../../out/components/definitions/token-style-property-map');

  it('Badge は background-color（React では backgroundColor）', () => {
    assert.strictEqual(getTokenStylePropertyKebab('Badge'), 'background-color');
    assert.strictEqual(tokenStyleKebabToReactCamel('background-color'), 'backgroundColor');
  });

  it('Link / Breadcrumb は color', () => {
    assert.strictEqual(getTokenStylePropertyKebab('Link'), 'color');
    assert.strictEqual(getTokenStylePropertyKebab('Breadcrumb'), 'color');
  });

  it('Image は border-color', () => {
    assert.strictEqual(getTokenStylePropertyKebab('Image'), 'border-color');
    assert.strictEqual(tokenStyleKebabToReactCamel('border-color'), 'borderColor');
  });
});
