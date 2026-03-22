const assert = require('assert');
const {
  tokenToPreviewInlineStyle
} = require('../../out/renderer/token-inline-style-from-definition');

describe('tokenToPreviewInlineStyle slot vocabulary (T-20260322-203)', () => {
  it('Text uses same --tui-slot-* var as export when defaultTokenSlot is set', () => {
    const style = tokenToPreviewInlineStyle('Text', '#112233');
    assert.ok(style);
    assert.strictEqual(style.color, 'var(--tui-slot-text-color, #112233)');
  });

  it('Container uses container.background slot per naming convention', () => {
    const style = tokenToPreviewInlineStyle('Container', 'rgb(1,2,3)');
    assert.ok(style);
    assert.strictEqual(style.backgroundColor, 'var(--tui-slot-container-background, rgb(1,2,3))');
  });

  it('components without defaultTokenSlot keep literal token (compat)', () => {
    const style = tokenToPreviewInlineStyle('Input', '#445566');
    assert.ok(style);
    assert.strictEqual(style.borderColor, '#445566');
  });

  it('returns undefined when token is missing', () => {
    assert.strictEqual(tokenToPreviewInlineStyle('Text', undefined), undefined);
  });
});
