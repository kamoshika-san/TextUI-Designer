const assert = require('assert');
const path = require('path');

describe('vscode host adapters', () => {
  const adaptersPath = path.resolve(__dirname, '../../out/services/vscode-host-adapters.js');
  const {
    toVscodeCompletionItemProvider,
    asVscodeTextDocument,
    asVscodePosition,
    asVscodeCompletionContext,
    asVscodeUri,
  } = require(adaptersPath);

  it('adapts array completion results into VS Code provider result', async () => {
    const provider = toVscodeCompletionItemProvider({
      provideCompletionItems: async () => [{ label: 'Button' }],
    });

    const result = await provider.provideCompletionItems(
      { fileName: 'a.tui.yml', uri: { toString: () => 'file://a' }, getText: () => '' },
      { line: 0, character: 0 },
      { isCancellationRequested: false },
      { triggerKind: 1 }
    );

    assert.ok(Array.isArray(result));
    assert.strictEqual(result[0].label, 'Button');
  });

  it('adapts completion-list-like results into vscode.CompletionList', async () => {
    const provider = toVscodeCompletionItemProvider({
      provideCompletionItems: async () => ({
        items: [{ label: 'Text' }],
        isIncomplete: true,
      }),
    });

    const result = await provider.provideCompletionItems(
      { fileName: 'a.tui.yml', uri: { toString: () => 'file://a' }, getText: () => '' },
      { line: 0, character: 0 },
      { isCancellationRequested: false },
      { triggerKind: 1 }
    );

    assert.ok(result);
    assert.ok(Array.isArray(result.items));
    assert.strictEqual(result.items[0].label, 'Text');
    assert.strictEqual(result.isIncomplete, true);
  });

  it('passes through cast helpers for boundary-local conversion', () => {
    const doc = { fileName: 'a.tui.yml', uri: { toString: () => 'file://a' }, getText: () => '' };
    const pos = { line: 1, character: 2 };
    const ctx = { triggerKind: 1, triggerCharacter: ':' };
    const uri = { toString: () => 'file://a' };

    assert.strictEqual(asVscodeTextDocument(doc), doc);
    assert.strictEqual(asVscodePosition(pos), pos);
    assert.strictEqual(asVscodeCompletionContext(ctx), ctx);
    assert.strictEqual(asVscodeUri(uri), uri);
  });
});
