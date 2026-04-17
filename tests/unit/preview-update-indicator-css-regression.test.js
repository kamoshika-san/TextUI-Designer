const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('Preview UpdateIndicator CSS regression (T-20260417-201)', () => {
  const cssPath = path.resolve(__dirname, '../../src/renderer/index.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  it('defines all required UpdateIndicator selectors', () => {
    [
      '.textui-update-indicator {',
      '.textui-update-indicator.is-updating {',
      '.textui-update-indicator.is-done {',
      '.textui-update-indicator-icon {',
      '.textui-update-indicator-spinner {',
      '.textui-update-indicator-check {',
      '.textui-update-indicator-label {',
    ].forEach((marker) => {
      assert.ok(
        css.includes(marker),
        `Expected UpdateIndicator CSS to define selector: ${marker}`
      );
    });
  });

  it('defines spin keyframe animation for spinner', () => {
    assert.ok(
      css.includes('@keyframes textui-update-indicator-spin'),
      'Expected UpdateIndicator CSS to define @keyframes textui-update-indicator-spin'
    );
  });
});
