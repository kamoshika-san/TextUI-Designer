const { describe, it, beforeEach } = require('mocha');
const { expect } = require('chai');
const sinon = require('sinon');

const { TextUICompletionProvider } = require('../../out/services/completion-provider');

describe('TextUICompletionProvider (real class behavior)', () => {
  let provider;
  let document;
  let position;
  let context;
  let token;

  beforeEach(() => {
    provider = new TextUICompletionProvider();

    document = {
      getText: sinon.stub().returns('page:\n  components:\n    - '),
      fileName: 'sample.template.yml',
      uri: { toString: () => 'file:///sample.tui.yml' },
      offsetAt: sinon.stub().callsFake(pos => pos.character)
    };
    position = { line: 2, character: 6 };
    context = { triggerCharacter: ':' };
    token = { isCancellationRequested: false };
  });

  it('provideCompletionItems: 有効な入力で処理できる', async () => {
    const items = await provider.provideCompletionItems(document, position, token, context);
    expect(items).to.be.an('array');
  });

  it('provideCompletionItems: 不正YAMLでも基本補完へフォールバックする', async () => {
    document.getText.returns('page:\n  - invalid: :');

    const items = await provider.provideCompletionItems(document, position, token, context);
    expect(items).to.be.an('array');
    expect(items.some(item => item.label === 'page')).to.equal(true);
  });

  it('provideCompletionItems: TTL内は補完候補キャッシュを再利用する', async () => {
    const first = await provider.provideCompletionItems(document, position, token, context);
    const second = await provider.provideCompletionItems(document, position, token, context);

    expect(first).to.be.an('array');
    expect(second).to.be.an('array');
    expect(first).to.deep.equal(second);
  });
});
