const { describe, it, beforeEach } = require('mocha');
const { expect } = require('chai');
const sinon = require('sinon');

const { TextUICompletionProvider } = require('../../out/services/completion-provider');

describe('TextUICompletionProvider delegation', () => {
  let provider;

  beforeEach(() => {
    provider = new TextUICompletionProvider({
      loadSchema: sinon.stub().resolves({})
    });
  });

  it('generateCompletionItems は analyzer/cache/engine に処理を委譲する', async () => {
    const now = 1000;
    sinon.stub(Date, 'now').returns(now);

    const analysisContext = { type: 'component-list' };
    const expectedItems = [{ label: 'Text' }];

    provider.contextAnalyzer = {
      buildCompletionRequestContext: sinon.stub().returns({
        text: 'page:\n  components:\n    - ',
        linePrefix: 'page:\n  components:\n    - ',
        currentWord: '',
        isTemplate: false,
        cacheKey: 'k'
      }),
      analyzeContext: sinon.stub().returns(analysisContext),
      generateCacheKey: sinon.stub(),
      collectContextMeta: sinon.stub(),
      getIndentLevel: sinon.stub(),
      findParentComponent: sinon.stub(),
      getCurrentWord: sinon.stub()
    };

    provider.completionCacheService = {
      getCachedCompletionItems: sinon.stub().returns(undefined),
      setCachedCompletionItems: sinon.stub(),
      loadSchemaWithCache: sinon.stub().resolves({}),
      getLastSchemaLoad: sinon.stub().returns(now),
      clear: sinon.stub(),
      getCompletionCacheMap: sinon.stub().returns(new Map()),
      getSchemaCache: sinon.stub().returns(null)
    };

    provider.schemaEngine = {
      parseYamlForSyntaxValidation: sinon.stub().resolves(),
      generateCompletionItemsFromSchema: sinon.stub().returns(expectedItems),
      getBasicCompletions: sinon.stub().returns([]),
      getComponentCompletions: sinon.stub(),
      getComponentPropertyCompletions: sinon.stub(),
      getPropertyValueCompletions: sinon.stub(),
      getRootLevelCompletions: sinon.stub()
    };

    const result = await provider.generateCompletionItems(
      { fileName: 'a.tui.yml' },
      { line: 0, character: 0 },
      { triggerCharacter: ':' }
    );

    expect(result).to.equal(expectedItems);
    expect(provider.contextAnalyzer.buildCompletionRequestContext.calledOnce).to.equal(true);
    expect(provider.schemaEngine.parseYamlForSyntaxValidation.calledOnce).to.equal(true);
    expect(provider.completionCacheService.loadSchemaWithCache.calledOnce).to.equal(true);
    expect(provider.contextAnalyzer.analyzeContext.calledOnce).to.equal(true);
    expect(provider.schemaEngine.generateCompletionItemsFromSchema.calledWith(analysisContext)).to.equal(true);
    expect(provider.completionCacheService.setCachedCompletionItems.calledOnce).to.equal(true);

    Date.now.restore();
  });

  it('cache hit 時は engine を呼ばずに返す', async () => {
    const cached = [{ label: 'cached' }];

    provider.contextAnalyzer = {
      buildCompletionRequestContext: sinon.stub().returns({
        text: 'x',
        linePrefix: 'x',
        currentWord: 'x',
        isTemplate: false,
        cacheKey: 'k'
      })
    };

    provider.completionCacheService = {
      getCachedCompletionItems: sinon.stub().returns(cached)
    };

    provider.schemaEngine = {
      parseYamlForSyntaxValidation: sinon.stub(),
      generateCompletionItemsFromSchema: sinon.stub(),
      getBasicCompletions: sinon.stub().returns([])
    };

    const result = await provider.generateCompletionItems(
      { fileName: 'a.tui.yml' },
      { line: 0, character: 0 },
      {}
    );

    expect(result).to.equal(cached);
    expect(provider.schemaEngine.parseYamlForSyntaxValidation.called).to.equal(false);
  });
});
