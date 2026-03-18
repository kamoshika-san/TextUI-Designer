const assert = require('assert');
const { describe, it } = require('mocha');

const { buildThemeStyleBlock } = require('../../out/exporters/theme-style-builder.js');

describe('theme-style-builder', () => {
  it('returns empty string for empty vars', () => {
    assert.strictEqual(buildThemeStyleBlock({}), '');
  });

  it('generates selector blocks and variable declarations', () => {
    const css = buildThemeStyleBlock({
      'component-button-primary-backgroundColor': '#112233',
      'component-badge-primary-backgroundColor': '#445566',
      'component-progress-fill-backgroundColor': '#778899'
    });

    // :root の変数注入が維持されている
    assert.ok(css.includes('--component-button-primary-backgroundColor: #112233 !important;'));
    assert.ok(css.includes('--component-badge-primary-backgroundColor: #445566 !important;'));
    assert.ok(css.includes('--component-progress-fill-backgroundColor: #778899 !important;'));

    // セレクタ付き上書きが維持されている
    assert.ok(css.includes('button[data-kind="primary"]'));
    assert.ok(css.includes('.textui-badge-primary'));
    assert.ok(css.includes('.textui-progress-fill'));
    assert.ok(css.includes('[data-alert-variant="info"]'));
    assert.ok(css.includes('.textui-image.rounded-full'));
  });
});

