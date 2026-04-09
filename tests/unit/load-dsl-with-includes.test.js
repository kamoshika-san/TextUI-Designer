const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('loadDslWithIncludes（CLI/Capture 経路の $include 展開）', () => {
  const loadModulePath = path.resolve(__dirname, '../../out/dsl/load-dsl-with-includes.js');

  /** 展開後ツリーに `$include` キーが残っていないことの簡易チェック */
  function hasIncludeKey(node) {
    if (node === null || typeof node !== 'object') {
      return false;
    }
    if (Array.isArray(node)) {
      return node.some(hasIncludeKey);
    }
    if (Object.prototype.hasOwnProperty.call(node, '$include')) {
      return true;
    }
    return Object.values(node).some(hasIncludeKey);
  }

  it('sample/03-include のエントリで $include を展開し、params 置換後の値が得られる', () => {
    delete require.cache[loadModulePath];
    const { loadDslWithIncludesFromPath } = require(loadModulePath);
    const entry = path.resolve(__dirname, '../../sample/03-include/include-sample.tui.yml');
    const { dsl, sourcePath } = loadDslWithIncludesFromPath(entry);

    assert.strictEqual(sourcePath, entry);
    assert.strictEqual(dsl.page.id, 'include-demo');
    assert.strictEqual(hasIncludeKey(dsl), false, '展開後も $include キーが残っている');

    const components = dsl.page.components;
    assert.ok(Array.isArray(components));
    const flat = JSON.stringify(components);
    assert.ok(flat.includes('ようこそ'), 'header.template の params 展開');
    assert.ok(flat.includes('お問い合わせ'), 'form-section の params 展開');
  });

  it('.tui.flow.yml を navigation-flow として認識する', () => {
    delete require.cache[loadModulePath];
    const { loadDslWithIncludesFromPath } = require(loadModulePath);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-flow-'));

    try {
      const entry = path.join(tmpDir, 'sample.tui.flow.yml');
      fs.writeFileSync(entry, [
        'flow:',
        '  id: checkout',
        '  title: Checkout Flow',
        '  entry: cart',
        '  screens:',
        '    - id: cart',
        '      page: cart-page',
        '  transitions:',
        '    - from: cart',
        '      to: confirm',
        '      trigger: next'
      ].join('\n'));

      const { dsl, sourcePath, kind } = loadDslWithIncludesFromPath(entry);
      assert.strictEqual(sourcePath, entry);
      assert.strictEqual(kind, 'navigation-flow');
      assert.strictEqual(dsl.flow.id, 'checkout');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
