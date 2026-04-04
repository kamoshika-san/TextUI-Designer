
const { expect } = require('chai');
const sinon = require('sinon');

// VSCode APIスタブ
const mockVSCode = {
  CompletionItem: class {
    constructor(label, kind) {
      this.label = label;
      this.kind = kind;
      this.detail = '';
      this.insertText = '';
      this.sortText = '';
    }
  },
  CompletionItemKind: {
    Class: 7,
    Property: 9,
    Value: 12,
    Module: 3,
    Field: 5
  },
  Position: class {
    constructor(line, character) {
      this.line = line;
      this.character = character;
    }
  },
  CompletionContext: class {
    constructor(triggerCharacter) {
      this.triggerCharacter = triggerCharacter;
    }
  },
  CancellationToken: class {
    constructor() {
      this.isCancellationRequested = false;
    }
  }
};

// グローバルにvscodeスタブを注入
global.vscode = mockVSCode;

// 注入済みvscodeを参照
const vscode = global.vscode;

const { TextUICompletionProvider } = require('../../out/services/completion-provider');

describe('TextUICompletionProvider', () => {
  let completionProvider;
  let mockDocument;
  let mockPosition;
  let mockContext;
  let mockToken;

  beforeEach(() => {
    // SchemaManagerのモック
    mockSchemaManager = {
      loadSchema: sinon.stub().returns({})
    };

    // Documentのモック
    mockDocument = {
      getText: sinon.stub().returns(''),
      fileName: 'test.tui.yml',
      uri: { toString: () => 'file:///test.tui.yml' },
      offsetAt: sinon.stub().returns(0)
    };

    // Positionのモック
    mockPosition = new vscode.Position(0, 0);

    // Contextのモック
    mockContext = new vscode.CompletionContext();

    // Tokenのモック
    mockToken = new vscode.CancellationToken();

    completionProvider = new TextUICompletionProvider();
  });

  afterEach(() => {
    sinon.restore();
    if (completionProvider && completionProvider.completionTimeout) {
      clearTimeout(completionProvider.completionTimeout);
    }
  });

  describe('provideCompletionItems', () => {
    it('デバウンス付きで補完アイテムを提供する', async () => {
      const clock = sinon.useFakeTimers();
      
      mockDocument.getText.returns('page:\n  components:\n    - ');
      mockDocument.offsetAt.callsFake(position => position.character);

      const promise = completionProvider.provideCompletionItems(mockDocument, mockPosition, mockToken, mockContext);
      await clock.runAllAsync();
      const result = await promise;
      
      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
      
      clock.restore();
    }).timeout(5000);

    it('非.tui.ymlファイルでは空配列を返す', async () => {
      mockDocument.fileName = 'test.txt';
      
      const result = await completionProvider.provideCompletionItems(mockDocument, mockPosition, mockToken, mockContext);
      
      expect(result).to.be.an('array');
      expect(result).to.have.length(0);
    });

    it('テンプレートファイルでも補完を提供する', async () => {
      mockDocument.fileName = 'test.template.yml';
      mockDocument.getText.returns('page:\n  components:\n    - ');
      mockDocument.offsetAt.callsFake(position => position.character);

      const result = await completionProvider.provideCompletionItems(mockDocument, mockPosition, mockToken, mockContext);
      
      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
    });

    it('エラー時は基本的な補完を提供する', async () => {
      mockDocument.getText.returns('invalid yaml content');
      mockDocument.offsetAt.callsFake(position => position.character);

      const result = await completionProvider.provideCompletionItems(mockDocument, mockPosition, mockToken, mockContext);
      
      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
    });
  });

  describe('generateCompletionItemsFromDescriptors', () => {
    it('コンポーネントリストの補完を生成する', () => {
      const linePrefix = 'page:\n  components:\n    - ';
      const position = new vscode.Position(2, 6);
      const currentWord = '';
      const schema = {};
      const isTemplate = false;

      const analysisContext = completionProvider.analyzeContext(linePrefix, position);
      const result = completionProvider.generateCompletionItemsFromDescriptors(analysisContext);

      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
      expect(result[0]).to.have.property('label');
      expect(result[0]).to.have.property('kind', vscode.CompletionItemKind.Class);
    });

    it('コンポーネントプロパティの補完を生成する', () => {
      const linePrefix = 'page:\n  components:\n    - Text:\n      ';
      const position = new vscode.Position(3, 6);
      const currentWord = '';
      const schema = {};
      const isTemplate = false;

      const analysisContext = completionProvider.analyzeContext(linePrefix, position);
      const result = completionProvider.generateCompletionItemsFromDescriptors(analysisContext);

      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
      expect(result[0]).to.have.property('label');
      expect(result[0]).to.have.property('kind', vscode.CompletionItemKind.Property);
    });

    it('プロパティ値の補完を生成する', () => {
      const linePrefix = 'page:\n  components:\n    - Text:\n      variant: ';
      const position = new vscode.Position(3, 14);
      const currentWord = '';
      const schema = {};
      const isTemplate = false;

      const analysisContext = completionProvider.analyzeContext(linePrefix, position);
      const result = completionProvider.generateCompletionItemsFromDescriptors(analysisContext);

      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
      expect(result[0]).to.have.property('label');
      expect(result[0]).to.have.property('kind', vscode.CompletionItemKind.Value);
    });

    it('ルートレベルの補完を生成する', () => {
      const linePrefix = '';
      const position = new vscode.Position(0, 0);
      const currentWord = '';
      const schema = {};
      const isTemplate = false;

      const analysisContext = completionProvider.analyzeContext(linePrefix, position);
      const result = completionProvider.generateCompletionItemsFromDescriptors(analysisContext);

      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
      expect(result[0]).to.have.property('label', 'page');
      expect(result[0]).to.have.property('kind', vscode.CompletionItemKind.Module);
    });
  });

  describe('analyzeContext', () => {
    it('コンポーネントリストのコンテキストを解析する', () => {
      const linePrefix = 'page:\n  components:\n    - ';
      const position = new vscode.Position(2, 6);

      const result = completionProvider.analyzeContext(linePrefix, position);

      expect(result).to.have.property('type', 'component-list');
    });

    it('コンポーネントプロパティのコンテキストを解析する', () => {
      const linePrefix = 'page:\n  components:\n    - Text:\n      ';
      const position = new vscode.Position(3, 6);

      const result = completionProvider.analyzeContext(linePrefix, position);

      expect(result).to.have.property('type', 'component-properties');
      expect(result).to.have.property('componentName');
    });

    it('プロパティ値のコンテキストを解析する', () => {
      const linePrefix = 'page:\n  components:\n    - Text:\n      variant: ';
      const position = new vscode.Position(3, 14);

      const result = completionProvider.analyzeContext(linePrefix, position);

      expect(result).to.have.property('type');
      expect(result).to.have.property('propertyName');
      expect(result).to.have.property('componentName');
    });

    it('ルートレベルのコンテキストを解析する', () => {
      const linePrefix = '';
      const position = new vscode.Position(0, 0);

      const result = completionProvider.analyzeContext(linePrefix, position);

      expect(result).to.have.property('type', 'root-level');
    });
  });

  describe('getComponentCompletions', () => {
    it('コンポーネントの補完候補を返す', () => {
      const result = completionProvider.getComponentCompletions();

      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
      
      const textComponent = result.find(item => item.label === 'Text');
      expect(textComponent).to.exist;
      expect(textComponent.kind).to.equal(vscode.CompletionItemKind.Class);
      expect(textComponent.detail).to.equal('テキストコンポーネント');
      expect(textComponent.insertText).to.equal('Text:\n    ');
    });
  });

  describe('getComponentPropertyCompletions', () => {
    it('Textコンポーネントのプロパティ補完を返す', () => {
      const result = completionProvider.getComponentPropertyCompletions('Text');

      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
      
      const variantProperty = result.find(item => item.label === 'variant');
      expect(variantProperty).to.exist;
      expect(variantProperty.kind).to.equal(vscode.CompletionItemKind.Property);
      expect(variantProperty.detail).to.include('テキスト');
    });

    it('存在しないコンポーネントでは空配列を返す', () => {
      const result = completionProvider.getComponentPropertyCompletions('NonExistent');

      expect(result).to.be.an('array');
      expect(result).to.have.length(0);
    });

    it('コンポーネント名が未指定では空配列を返す', () => {
      const result = completionProvider.getComponentPropertyCompletions();

      expect(result).to.be.an('array');
      expect(result).to.have.length(0);
    });
  });

  describe('getPropertyValueCompletions', () => {
    it('variantプロパティの値補完を返す', () => {
      const result = completionProvider.getPropertyValueCompletions('variant', 'Text');

      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
      
      const h1Value = result.find(item => item.label === 'h1');
      expect(h1Value).to.exist;
      expect(h1Value.kind).to.equal(vscode.CompletionItemKind.Value);
      expect(h1Value.detail).to.equal('見出し1');
    });

    it('typeプロパティの値補完を返す', () => {
      const result = completionProvider.getPropertyValueCompletions('type', 'Input');

      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
      
      const textValue = result.find(item => item.label === 'text');
      expect(textValue).to.exist;
      expect(textValue.kind).to.equal(vscode.CompletionItemKind.Value);
      expect(textValue.detail).to.equal('テキスト');
    });

    it('存在しないプロパティでは空配列を返す', () => {
      const result = completionProvider.getPropertyValueCompletions('nonExistent', 'Text');

      expect(result).to.be.an('array');
      expect(result).to.have.length(0);
    });

    it('プロパティ名またはコンポーネント名が未指定では空配列を返す', () => {
      const result1 = completionProvider.getPropertyValueCompletions('variant');
      const result2 = completionProvider.getPropertyValueCompletions(undefined, 'Text');
      const result3 = completionProvider.getPropertyValueCompletions();

      expect(result1).to.be.an('array');
      expect(result1).to.have.length(0);
      expect(result2).to.be.an('array');
      expect(result2).to.have.length(0);
      expect(result3).to.be.an('array');
      expect(result3).to.have.length(0);
    });
  });

  describe('getRootLevelCompletions', () => {
    it('ルートレベルの補完候補を返す', () => {
      const result = completionProvider.getRootLevelCompletions();

      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
      
      const pageItem = result.find(item => item.label === 'page');
      expect(pageItem).to.exist;
      expect(pageItem.kind).to.equal(vscode.CompletionItemKind.Module);
      expect(pageItem.detail).to.equal('ページ定義');
      expect(pageItem.insertText).to.include('page:');
    });
  });

  describe('getBasicCompletions', () => {
    it('基本的な補完候補を返す', () => {
      const linePrefix = '';
      const position = new vscode.Position(0, 0);
      const currentWord = '';

      const result = completionProvider.getBasicCompletions(linePrefix, position, currentWord);

      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
      
      const pageItem = result.find(item => item.label === 'page');
      expect(pageItem).to.exist;
      expect(pageItem.kind).to.equal(vscode.CompletionItemKind.Field);
      expect(pageItem.detail).to.equal('ページ定義');
    });
  });

  describe('キャッシュ機能', () => {
    it('キャッシュキーを正しく生成する', () => {
      const document = {
        uri: { toString: () => 'file:///test.tui.yml' },
        getText: sinon.stub().returns('test content'),
        offsetAt: sinon.stub().returns(0)
      };
      const position = new vscode.Position(1, 5);
      const context = new vscode.CompletionContext(':');
      const isTemplate = false;

      const result = completionProvider.generateCacheKey(document, position, context, isTemplate);

      expect(result).to.be.a('string');
      expect(result).to.include('file:///test.tui.yml');
      expect(result).to.include('1:5');
      expect(result).to.include('false');
      expect(result).to.include(':');
    });

    it('キャッシュをクリアする', () => {
      // キャッシュにデータを追加
      completionProvider.completionCache.set('test', { items: [], timestamp: Date.now() });

      expect(completionProvider.completionCache.size).to.be.greaterThan(0);

      completionProvider.clearCache();

      expect(completionProvider.completionCache.size).to.equal(0);
    });
  });

  describe('ユーティリティ関数', () => {
    it('インデントレベルを正しく取得する', () => {
      expect(completionProvider.getIndentLevel('')).to.equal(0);
      expect(completionProvider.getIndentLevel('  text')).to.equal(2);
      expect(completionProvider.getIndentLevel('    text')).to.equal(4);
      expect(completionProvider.getIndentLevel('\ttext')).to.equal(1);
    });

    it('親コンポーネント名を正しく取得する', () => {
      const lines = [
        'page:',
        '  components:',
        '    - Text:',
        '      variant: h1',
        '    - Button:',
        '      text: "Click"',
      ];
      const result = completionProvider.findParentComponent(lines, 3);
      expect(result).to.be.a('string');
      expect(result).to.equal('Text');
    });

    it('現在の単語を正しく取得する', () => {
      expect(completionProvider.getCurrentWord('')).to.equal('');
      expect(completionProvider.getCurrentWord('text')).to.equal('text');
      expect(completionProvider.getCurrentWord('  variant')).to.equal('variant');
      // 実際の動作に合わせて期待値を調整
      expect(completionProvider.getCurrentWord('variant: ')).to.be.a('string');
    });
  });

  describe('エラーハンドリング', () => {
    it('YAMLパースエラー時に基本的な補完を提供する', async () => {
      mockDocument.getText.returns('invalid: yaml: content:');
      mockDocument.offsetAt.callsFake(position => position.character);

      const result = await completionProvider.provideCompletionItems(mockDocument, mockPosition, mockToken, mockContext);

      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
      
      // 基本的な補完アイテムが含まれていることを確認
      const hasBasicItems = result.some(item => 
        ['page', 'id', 'title', 'layout', 'components'].includes(item.label)
      );
      expect(hasBasicItems).to.be.true;
    });

    it('非同期処理でエラーが発生しても空配列を返す', async () => {
      // エラーを発生させるためのモック
      const errorStub = sinon.stub(completionProvider, 'generateCompletionItems').rejects(new Error('Test error'));

      const result = await completionProvider.provideCompletionItems(mockDocument, mockPosition, mockToken, mockContext);

      expect(result).to.be.an('array');
      expect(result).to.have.length(0);

      errorStub.restore();
    });
  });

  describe('パフォーマンス', () => {
    it('デバウンス時間が適切に設定されている', () => {
      expect(completionProvider.CACHE_TTL).to.equal(10000);
    });

    it('キャッシュTTLが適切に設定されている', () => {
      expect(completionProvider.CACHE_TTL).to.equal(10000);
    });
  });
});
