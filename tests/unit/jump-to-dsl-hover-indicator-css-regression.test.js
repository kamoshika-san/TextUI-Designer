const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('Jump-to-DSL hover indicator CSS regression (T-616 / T-617)', () => {
  const cssPath = path.resolve(__dirname, '../../src/renderer/index.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  it('defines explicit theme hooks for jump indicator and badge styling', () => {
    [
      '--textui-jump-indicator-outline-color',
      '--textui-jump-indicator-halo-color',
      '--textui-jump-indicator-background-color',
      '--textui-jump-badge-background-color',
      '--textui-jump-badge-text-color',
      '--textui-jump-badge-shadow',
      '--textui-jump-badge-accent-background-color',
      '--textui-jump-badge-accent-text-color',
    ].forEach((token) => {
      assert.ok(
        css.includes(token),
        `Expected jump-to-DSL hover indicator CSS to define theme hook: ${token}`
      );
    });
  });

  it('keeps the main jump target and badge selectors wired to theme hooks', () => {
    [
      '.ctrl-key-down .textui-jump-target:hover {',
      '.textui-jump-target:focus-visible {',
      '.textui-preview-root-hide-jump-hover .textui-jump-target:hover {',
      '.ctrl-key-down .textui-jump-target:hover .textui-jump-badge,',
      '.textui-jump-target:focus-visible .textui-jump-badge {',
      '.textui-preview-root-hide-jump-hover .textui-jump-target:hover .textui-jump-badge {',
      'outline: 2px solid var(--textui-jump-indicator-outline-color);',
      'box-shadow: 0 0 0 4px var(--textui-jump-indicator-halo-color);',
      'background-color: var(--textui-jump-indicator-background-color);',
      'background: var(--textui-jump-badge-background-color);',
      'color: var(--textui-jump-badge-text-color);',
      'box-shadow: var(--textui-jump-badge-shadow);',
      'background: var(--textui-jump-badge-accent-background-color);',
      'color: var(--textui-jump-badge-accent-text-color);',
    ].forEach((marker) => {
      assert.ok(
        css.includes(marker),
        `Expected jump-to-DSL hover indicator CSS to keep regression marker: ${marker}`
      );
    });
  });
});
