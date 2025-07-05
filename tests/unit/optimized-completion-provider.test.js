const { describe, it, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const sinon = require('sinon');
const vscode = require('vscode');

// モックの設定
const mockVscode = {
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
    Keyword: 14,
    Field: 5
  },
  Position: class {
    constructor(line, character) {
      this.line = line;
      this.character = character;
    }
  },
  SnippetString: class {
    constructor(value) {
      this.value = value;
    }
  }
};

// グローバルモック
global.vscode = mockVscode;
global.vscode.Position = mockVscode.Position;

// テスト対象のインポート
const { OptimizedCompletionProvider } = require('../../out/services/completion');
const { CompletionContextAnalyzer } = require('../../out/services/completion');
const { ComponentDefinitions } = require('../../out/services/completion');
const { CompletionCache } = require('../../out/services/completion');

describe('OptimizedCompletionProvider', () => {
  let provider;
  let mockSchemaManager;

  beforeEach(() => {
    mockSchemaManager = {
      loadSchema: sinon.stub().resolves({})
    };
    provider = new OptimizedCompletionProvider(mockSchemaManager);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('初期化', () => {
    it('正常に初期化される', () => {
      expect(provider).to.be.instanceOf(OptimizedCompletionProvider);
    });
  });

  describe('provideCompletionItems', () => {
    it('非tui.ymlファイルでは空配列を返す', async () => {
      const document = {
        fileName: 'test.txt',
        getText: () => '',
        offsetAt: () => 0
      };
      const position = new mockVscode.Position(0, 0);
      const context = {};

      const result = await provider.provideCompletionItems(document, position, {}, context);
      expect(result).to.deep.equal([]);
    });

    it('tui.ymlファイルでコンポーネント補完を提供', async () => {
      const text = 'page:\n  components:\n    - ';
      const document = {
        fileName: 'test.tui.yml',
        getText: () => text,
        offsetAt: (pos) => {
          const lines = text.split('\n');
          let idx = 0;
          for (let i = 0; i < pos.line; i++) idx += lines[i].length + 1;
          const result = idx + pos.character;
          return result;
        }
      };
      const position = new mockVscode.Position(2, 6); // "    - " の末尾
      const context = {};

      const result = await provider.provideCompletionItems(document, position, {}, context);
      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
    });
  });

  describe('キャッシュ機能', () => {
    it('キャッシュをクリアできる', () => {
      expect(() => provider.clearCache()).to.not.throw();
    });

    it('キャッシュ統計を取得できる', () => {
      const stats = provider.getCacheStats();
      expect(stats).to.have.property('size');
      expect(stats).to.have.property('maxSize');
      expect(stats).to.have.property('hitRate');
    });
  });
});

describe('CompletionContextAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new CompletionContextAnalyzer();
  });

  describe('analyze', () => {
    it('コンポーネントリストコンテキストを正しく識別', () => {
      const linePrefix = 'page:\n  components:\n    - ';
      const position = new mockVscode.Position(2, 4);

      const result = analyzer.analyze(linePrefix, position);
      expect(result.type).to.equal('component-list');
    });

    it('ルートレベルコンテキストを正しく識別', () => {
      const linePrefix = '';
      const position = new mockVscode.Position(0, 0);

      const result = analyzer.analyze(linePrefix, position);
      expect(result.type).to.equal('root-level');
    });

    it('コンポーネントプロパティコンテキストを正しく識別', () => {
      const linePrefix = 'page:\n  components:\n    - Text:\n      ';
      const position = new mockVscode.Position(3, 6);

      const result = analyzer.analyze(linePrefix, position);
      expect(result.type).to.equal('component-properties');
      expect(result.componentName).to.equal('Text');
    });
  });
});

describe('ComponentDefinitions', () => {
  describe('getComponent', () => {
    it('存在するコンポーネントを取得できる', () => {
      const component = ComponentDefinitions.getComponent('Text');
      expect(component).to.exist;
      expect(component.name).to.equal('Text');
    });

    it('存在しないコンポーネントはundefinedを返す', () => {
      const component = ComponentDefinitions.getComponent('NonExistent');
      expect(component).to.be.undefined;
    });
  });

  describe('getAllComponents', () => {
    it('全コンポーネントを取得できる', () => {
      const components = ComponentDefinitions.getAllComponents();
      expect(components).to.be.an('array');
      expect(components.length).to.be.greaterThan(0);
    });
  });

  describe('getComponentProperties', () => {
    it('コンポーネントのプロパティを取得できる', () => {
      const properties = ComponentDefinitions.getComponentProperties('Text');
      expect(properties).to.be.an('array');
      expect(properties.length).to.be.greaterThan(0);
    });
  });

  describe('getPropertyValues', () => {
    it('プロパティの値を取得できる', () => {
      const values = ComponentDefinitions.getPropertyValues('variant');
      expect(values).to.be.an('array');
      expect(values.length).to.be.greaterThan(0);
    });
  });

  describe('getTemplateComponents', () => {
    it('テンプレートコンポーネントを取得できる', () => {
      const components = ComponentDefinitions.getTemplateComponents();
      expect(components).to.be.an('array');
      expect(components.length).to.be.greaterThan(0);
    });
  });
});

describe('CompletionCache', () => {
  let cache;

  beforeEach(() => {
    cache = new CompletionCache(1000, 10);
  });

  describe('set/get', () => {
    it('値を設定して取得できる', () => {
      const items = [{ label: 'test' }];
      cache.set('test-key', items);
      
      const result = cache.get('test-key');
      expect(result).to.deep.equal(items);
    });

    it('期限切れの値はnullを返す', (done) => {
      const shortTtlCache = new CompletionCache(10, 10);
      const items = [{ label: 'test' }];
      
      shortTtlCache.set('test-key', items);
      
      setTimeout(() => {
        const result = shortTtlCache.get('test-key');
        expect(result).to.be.null;
        done();
      }, 20);
    });
  });

  describe('generateKey', () => {
    it('一意のキーを生成できる', () => {
      const text = 'page:\n  components:\n    - ';
      const document = {
        uri: { toString: () => 'file://test' },
        getText: () => text,
        offsetAt: (pos) => {
          const lines = text.split('\n');
          let idx = 0;
          for (let i = 0; i < pos.line; i++) idx += lines[i].length + 1;
          return idx + pos.character;
        }
      };
      const position = new mockVscode.Position(1, 2);
      const context = { triggerCharacter: ':' };
      
      const key1 = cache.generateKey(document, position, context, false);
      const key2 = cache.generateKey(document, position, context, true);
      
      expect(key1).to.not.equal(key2);
    });
  });

  describe('clear', () => {
    it('キャッシュをクリアできる', () => {
      cache.set('test-key', [{ label: 'test' }]);
      expect(cache.get('test-key')).to.exist;
      
      cache.clear();
      expect(cache.get('test-key')).to.be.null;
    });
  });

  describe('getStats', () => {
    it('統計情報を取得できる', () => {
      const stats = cache.getStats();
      expect(stats).to.have.property('size');
      expect(stats).to.have.property('maxSize');
      expect(stats).to.have.property('hitRate');
    });
  });
}); 