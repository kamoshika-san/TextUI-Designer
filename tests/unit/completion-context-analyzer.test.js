const { describe, it } = require('mocha');
const { expect } = require('chai');

const { CompletionContextAnalyzer } = require('../../out/services/completion-context-analyzer');

describe('CompletionContextAnalyzer', () => {
  const analyzer = new CompletionContextAnalyzer();

  it('buildCompletionRequestContext で文脈情報を抽出できる', () => {
    const text = 'page:\n  components:\n    - Text:\n      variant: ';
    const document = {
      fileName: 'sample.tui.yml',
      uri: { toString: () => 'file:///sample.tui.yml' },
      getText: () => text,
      offsetAt: ({ line, character }) => {
        const lines = text.split('\n');
        let offset = 0;
        for (let i = 0; i < line; i++) {
          offset += lines[i].length + 1;
        }
        return offset + character;
      }
    };
    const position = { line: 3, character: 15 };
    const context = { triggerCharacter: ':' };

    const result = analyzer.buildCompletionRequestContext(document, position, context, (line, character) => ({ line, character }));

    expect(result.text).to.equal(text);
    expect(result.linePrefix).to.include('variant: ');
    expect(result.currentWord).to.be.a('string');
    expect(result.isTemplate).to.equal(false);
    expect(result.cacheKey).to.include('file:///sample.tui.yml');
  });

  it('analyzeContext で property-value を判定できる', () => {
    const linePrefix = 'page:\n  components:\n    - Text:\n      variant: ';
    const result = analyzer.analyzeContext(linePrefix, { line: 3, character: 15 });

    expect(result.type).to.equal('property-value');
    expect(result.propertyName).to.equal('variant');
    expect(result.componentName).to.equal('Text');
  });

  it('collectContextMeta で root key と同階層プロパティを収集できる', () => {
    const lines = ['page:', '  id: top', '  components:', '    - Text:', '      variant: h1', '      text: hello'];
    const result = analyzer.collectContextMeta(lines, 5, 6);

    expect(result.rootKeys.has('page')).to.equal(true);
    expect(result.existingProperties.has('variant')).to.equal(true);
  });
});
