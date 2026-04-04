const assert = require('assert');


const { themeStyleResolver } = require('../../out/exporters/theme-style-resolver.js');

describe('theme-style-resolver', () => {
  it('var 値を fallback 付き CSS var として解決する', () => {
    const resolved = themeStyleResolver.resolveValue({
      kind: 'var',
      varKey: 'component-button-primary-backgroundColor',
      fallback: '#2563eb'
    });
    assert.strictEqual(
      resolved,
      'var(--component-button-primary-backgroundColor, #2563eb)'
    );
  });

  it('raw 値をそのまま解決する', () => {
    const resolved = themeStyleResolver.resolveValue({
      kind: 'raw',
      value: 'flex'
    });
    assert.strictEqual(resolved, 'flex');
  });
});
