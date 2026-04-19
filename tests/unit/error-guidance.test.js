const assert = require('assert');
const { createErrorGuidance } = require('../../out/renderer/error-guidance');

describe('createErrorGuidance', () => {
  it('文字列エラーにYAML向けの次アクションを返す', () => {
    const guidance = createErrorGuidance('bad yaml');

    assert.strictEqual(guidance.title, 'YAML parse error');
    assert.ok(guidance.actionItems.length >= 2);
    assert.ok(guidance.documentLinks.some(link => link.label === 'YAML specification'));
    assert.strictEqual(guidance.technicalDetails, 'bad yaml');
  });

  it('schemaエラー時にスキーマ導線を返す', () => {
    const guidance = createErrorGuidance({
      type: 'schema',
      details: {
        message: 'invalid component',
        lineNumber: 1,
        columnNumber: 1,
        errorContext: 'component: x',
        suggestions: ['typeを確認してください'],
        fileName: 'sample.tui.yml',
        fullPath: '/tmp/sample.tui.yml',
        allErrors: [{ path: '/page/components/0/type', message: 'must be one of enum values' }]
      }
    });

    assert.strictEqual(guidance.title, 'Schema validation error');
    assert.ok(guidance.documentLinks.some(link => link.label === 'TextUI schema'));
    assert.ok(guidance.technicalDetails.includes('/page/components/0/type'));
  });
});
