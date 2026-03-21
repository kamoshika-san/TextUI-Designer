const assert = require('assert');

const { getDocumentKind, getValidationSchemaKind } = require('../../out/services/document-kind-resolver');

describe('DocumentKindResolver', () => {
  it('メイン DSL（サポート拡張子）は main', () => {
    assert.strictEqual(getDocumentKind('C:/proj/page.tui.yml'), 'main');
    assert.strictEqual(getDocumentKind('/home/u/x.tui.yaml'), 'main');
  });

  it('テンプレート拡張子は template', () => {
    assert.strictEqual(getDocumentKind('C:/proj/frag.template.yml'), 'template');
    assert.strictEqual(getDocumentKind('/x.template.yaml'), 'template');
    assert.strictEqual(getDocumentKind('C:/a.template.json'), 'template');
  });

  it('テーマ命名は theme', () => {
    assert.strictEqual(getDocumentKind('/proj/my-theme.yml'), 'theme');
    assert.strictEqual(getDocumentKind('C:/proj/sub/textui-theme.yml'), 'theme');
    assert.strictEqual(getDocumentKind('/x/foo_theme.yaml'), 'theme');
  });

  it('対象外拡張子は unsupported', () => {
    assert.strictEqual(getDocumentKind('C:/x/readme.txt'), 'unsupported');
    assert.strictEqual(getDocumentKind('/a/b/c.md'), 'unsupported');
  });

  it('getValidationSchemaKind は template / theme / main をそのまま返し unsupported は main にフォールバック', () => {
    assert.strictEqual(getValidationSchemaKind('a.tui.yml'), 'main');
    assert.strictEqual(getValidationSchemaKind('t.template.yml'), 'template');
    assert.strictEqual(getValidationSchemaKind('z-theme.yml'), 'theme');
    assert.strictEqual(getValidationSchemaKind('nope.txt'), 'main');
  });
});
