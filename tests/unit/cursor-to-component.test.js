/**
 * cursorLineToComponentIndex のユニットテスト
 * T-U02: カーソル→コンポーネント mapping
 */

const assert = require('assert');
const { describe, it } = require('mocha');

const { cursorLineToComponentIndex } = require('../../out/services/webview/cursor-to-component.js');

const yaml1 = `page:
  components:
    - Button:
        label: OK
    - Text:
        text: Hello
    - Button:
        label: Cancel
`;

describe('cursorLineToComponentIndex', () => {
  it('components セクション外の行（page: 行）は null を返す', () => {
    assert.strictEqual(cursorLineToComponentIndex(yaml1, 0), null);
  });

  it('1番目のコンポーネント先頭行（index 2）は 0 を返す', () => {
    // line 2: "    - Button:"
    assert.strictEqual(cursorLineToComponentIndex(yaml1, 2), 0);
  });

  it('1番目のコンポーネントのプロパティ行（index 3）は 0 を返す', () => {
    // line 3: "        label: OK"
    assert.strictEqual(cursorLineToComponentIndex(yaml1, 3), 0);
  });

  it('2番目のコンポーネント先頭行（index 4）は 1 を返す', () => {
    // line 4: "    - Text:"
    assert.strictEqual(cursorLineToComponentIndex(yaml1, 4), 1);
  });

  it('3番目のコンポーネント先頭行（index 6）は 2 を返す', () => {
    // line 6: "    - Button:"
    assert.strictEqual(cursorLineToComponentIndex(yaml1, 6), 2);
  });

  it('空コンポーネント配列では null を返す', () => {
    const yaml = `page:\n  components:\n`;
    assert.strictEqual(cursorLineToComponentIndex(yaml, 0), null);
  });

  it('components: セクションが存在しない YAML では null を返す', () => {
    const yaml = `page:\n  title: test\n`;
    assert.strictEqual(cursorLineToComponentIndex(yaml, 1), null);
  });
});
