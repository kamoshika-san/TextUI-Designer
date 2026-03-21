const assert = require('assert');

/**
 * T-20260321-016: `tokenStyleProperty` ??????definitions?? React camelCase ?????????
 * ?? `npm run compile` ????????
 */
describe('token-style-property-map', () => {
  // T-20260321-003?src-first?: out ?????????src ? ts-node ????????
  const path = require('path');
  require('ts-node').register({
    transpileOnly: true,
    project: path.join(__dirname, '../../tsconfig.json')
  });

  const {
    getTokenStylePropertyKebab,
    tokenStyleKebabToReactCamel
  } = require('../../src/components/definitions/token-style-property-map');

  it('Badge ? background-color?React ?? backgroundColor?', () => {
    assert.strictEqual(getTokenStylePropertyKebab('Badge'), 'background-color');
    assert.strictEqual(tokenStyleKebabToReactCamel('background-color'), 'backgroundColor');
  });

  it('Link / Breadcrumb ? color', () => {
    assert.strictEqual(getTokenStylePropertyKebab('Link'), 'color');
    assert.strictEqual(getTokenStylePropertyKebab('Breadcrumb'), 'color');
  });

  it('Image ? border-color', () => {
    assert.strictEqual(getTokenStylePropertyKebab('Image'), 'border-color');
    assert.strictEqual(tokenStyleKebabToReactCamel('border-color'), 'borderColor');
  });
});
