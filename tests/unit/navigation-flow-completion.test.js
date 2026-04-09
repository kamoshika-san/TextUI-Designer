const assert = require('assert');

const { TextUICompletionProvider } = require('../../out/services/completion-provider');

describe('navigation flow completion', () => {
  let provider;

  const createDocument = (content, fileName) => ({
    fileName,
    uri: { toString: () => `file://${fileName}` },
    getText: () => content,
    offsetAt: (position) => {
      const lines = content.split('\n');
      let offset = 0;
      for (let i = 0; i < position.line; i += 1) {
        offset += (lines[i] || '').length + 1;
      }
      return offset + position.character;
    }
  });

  beforeEach(() => {
    provider = new TextUICompletionProvider();
  });

  it('offers flow root completion for .tui.flow.yml files', async () => {
    const content = '';
    const document = createDocument(content, '/tmp/sample.tui.flow.yml');
    const position = new global.vscode.Position(0, 0);
    const items = await provider.generateCompletionItems(document, position, { triggerCharacter: '' });

    assert.ok(items.some(item => item.label === 'flow'));
  });

  it('offers known screen ids for entry and transition targets', () => {
    const content = [
      'flow:',
      '  id: checkout',
      '  title: Checkout Flow',
      '  entry: ',
      '  screens:',
      '    - id: cart',
      '      page: cart-page',
      '    - id: confirm',
      '      page: confirm-page',
      '  transitions:',
      '    - from: '
    ].join('\n');

    const entryItems = provider.generateNavigationFlowCompletionItems(content, new global.vscode.Position(3, 9));
    const transitionItems = provider.generateNavigationFlowCompletionItems(content, new global.vscode.Position(10, 11));

    assert.ok(entryItems.some(item => item.label === 'cart'));
    assert.ok(entryItems.some(item => item.label === 'confirm'));
    assert.ok(transitionItems.some(item => item.label === 'cart'));
  });
});
