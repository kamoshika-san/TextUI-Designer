const assert = require('assert');
const { assembleDiagnosticMarkdownMessage } = require('../../out/services/diagnostics/diagnostic-message-assembler');

describe('diagnostic-message-assembler', () => {
  it('テンプレートと場所ラベルから複数行メッセージを組み立てる', () => {
    const msg = assembleDiagnosticMarkdownMessage(
      {
        code: 'TUI001',
        summary: 's',
        cause: 'c',
        fix: 'f',
        severity: 0
      },
      'path: line 1'
    );
    assert.ok(msg.includes('[TUI001]'));
    assert.ok(msg.includes('原因: c'));
    assert.ok(msg.includes('場所: path: line 1'));
  });
});
