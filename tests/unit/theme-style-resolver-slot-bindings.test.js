const assert = require('assert');
const { themeStyleResolver } = require('../../out/exporters/theme-style-resolver');

describe('ThemeStyleResolver token slot bindings (T-20260322-340)', () => {
  it('keeps single-slot compatibility for Text', () => {
    assert.deepStrictEqual(themeStyleResolver.resolveComponentTokenSlotBindings('Text'), [
      { slotId: 'text.color', property: 'color' }
    ]);
  });

  it('resolves declared multi-slot bindings for Container in declaration order', () => {
    assert.deepStrictEqual(themeStyleResolver.resolveComponentTokenSlotBindings('Container'), [
      { slotId: 'container.background', property: 'background-color' },
      { slotId: 'container.border', property: 'border-color' }
    ]);
  });

  it('falls back to a compatible derived slot when no slot metadata exists', () => {
    assert.deepStrictEqual(themeStyleResolver.resolveComponentTokenSlotBindings('Input'), [
      { slotId: 'input.border', property: 'border-color' }
    ]);
  });

  it('formats resolved slot values with the shared --tui-slot-* vocabulary', () => {
    assert.strictEqual(
      themeStyleResolver.formatResolvedTokenSlotValue('container.border', '#445566'),
      'var(--tui-slot-container-border, #445566)'
    );
  });
});
