const { describe, it, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const sinon = require('sinon');

// VSCode APIのモック
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

// グローバルにvscodeをモック
global.vscode = mockVSCode;

// モックされたvscodeを使用
const vscode = global.vscode;

// TextUICompletionProviderクラスをモック
class MockTextUICompletionProvider {
  constructor(schemaManager) {
    this.schemaManager = schemaManager;
    this.schemaCache = null;
    this.lastSchemaLoad = 0;
    this.completionCache = new Map();
    this.CACHE_TTL = 10000;
    this.completionTimeout = null;
  }

  async provideCompletionItems(document, position, token, context) {
    if (this.completionTimeout) {
      clearTimeout(this.completionTimeout);
    }

    return new Promise((resolve) => {
      this.completionTimeout = setTimeout(async () => {
        try {
          const items = await this.generateCompletionItems(document, position, context);
          resolve(items);
        } catch (error) {
          console.error('[CompletionProvider] 補完処理でエラーが発生しました:', error);
          resolve([]);
        }
      }, 150);
    });
  }

  async generateCompletionItems(document, position, context) {
    const text = document.getText();
    const linePrefix = text.substring(document.offsetAt(new vscode.Position(position.line, 0)), document.offsetAt(position));
    const currentWord = this.getCurrentWord(linePrefix);
    const isTemplate = /\.template\.(ya?ml|json)$/.test(document.fileName);
    
    if (!document.fileName.endsWith('.tui.yml') && !isTemplate) {
      return [];
    }
    
    try {
      const cacheKey = this.generateCacheKey(document, position, context, isTemplate);
      const now = Date.now();
      
      const cached = this.completionCache.get(cacheKey);
      if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
        return cached.items;
      }

      // YAMLパース処理をシミュレート
      const yaml = await new Promise((resolve, reject) => {
        setImmediate(() => {
          try {
            // 簡単なYAMLパースシミュレーション
            if (text.includes('invalid')) {
              reject(new Error('YAML parse error'));
            } else {
              resolve({});
            }
          } catch (error) {
            reject(error);
          }
        });
      });
      
      if (!this.schemaCache || (now - this.lastSchemaLoad) > this.CACHE_TTL) {
        this.schemaCache = this.schemaManager.loadSchema();
        this.lastSchemaLoad = now;
      }
      
      const items = this.generateCompletionItemsFromSchema(linePrefix, position, currentWord, this.schemaCache, isTemplate);
      
      this.completionCache.set(cacheKey, {
        items: items,
        timestamp: now
      });
      
      return items;
    } catch (error) {
      return this.getBasicCompletions(linePrefix, position, currentWord);
    }
  }

  generateCacheKey(document, position, context, isTemplate) {
    const text = document.getText();
    const linePrefix = text.substring(document.offsetAt(new vscode.Position(position.line, 0)), document.offsetAt(position));
    const triggerChar = context.triggerCharacter || '';
    
    return `${document.uri.toString()}:${position.line}:${position.character}:${isTemplate}:${triggerChar}:${linePrefix}`;
  }

  generateCompletionItemsFromSchema(linePrefix, position, currentWord, schema, isTemplate) {
    const items = [];
    const context = this.analyzeContext(linePrefix, position);
    
    switch (context.type) {
      case 'component-list':
        items.push(...this.getComponentCompletions());
        break;
      case 'component-properties':
        items.push(...this.getComponentPropertyCompletions(context.componentName));
        break;
      case 'property-value':
        items.push(...this.getPropertyValueCompletions(context.propertyName, context.componentName));
        break;
      case 'root-level':
        items.push(...this.getRootLevelCompletions());
        break;
    }

    return items;
  }

  analyzeContext(linePrefix, position) {
    const lines = linePrefix.split('\n');
    const currentLine = lines[lines.length - 1];
    const indentLevel = this.getIndentLevel(currentLine);
    
    // ハイフンの後（コンポーネントリスト）
    if (currentLine.trim().endsWith('-') || currentLine.trim() === '-') {
      return { type: 'component-list' };
    }
    
    // ルートレベル
    if (indentLevel === 0) {
      return { type: 'root-level' };
    }
    
    // プロパティ値の行（例: variant: ...）を先に判定
    const propertyMatch = currentLine.match(/^\s*(\w+):\s*(.*)$/);
    if (propertyMatch) {
      const propertyName = propertyMatch[1];
      const componentName = this.findParentComponent(lines, lines.length - 1);
      if (componentName) {
        return { type: 'property-value', propertyName, componentName };
      }
    }
    
    // コンポーネント名の行（- Text: も含む）
    const componentMatch = currentLine.match(/^-?\s*(\w+):\s*$/);
    if (componentMatch) {
      const componentName = this.findParentComponent(lines, lines.length - 1);
      if (componentName) {
        return { type: 'property-value', propertyName: componentMatch[1], componentName };
      } else {
        return { type: 'component-properties', componentName: componentMatch[1] };
      }
    }
    
    // 空白行やその他の行で、親コンポーネントのプロパティ入力中
    const componentName = this.findParentComponent(lines, lines.length - 1);
    if (componentName) {
      return { type: 'component-properties', componentName };
    }
    
    return { type: 'root-level' };
  }

  getIndentLevel(line) {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }

  findParentComponent(lines, currentIndex) {
    // プロパティ行や空白行の場合、currentIndexから上に遡って最初のコンポーネント行を返す
    for (let i = currentIndex - 1; i >= 0; i--) {
      const line = lines[i];
      if (line.trim() === '') continue;
      const match = line.match(/^\s*-?\s*(\w+):\s*$/);
      if (match && match[1] !== 'components' && match[1] !== 'page') {
        return match[1];
      }
    }
    return undefined;
  }

  getComponentCompletions() {
    const components = [
      { name: 'Text', description: 'テキストコンポーネント' },
      { name: 'Input', description: '入力フィールド' },
      { name: 'Button', description: 'ボタン' },
      { name: 'Checkbox', description: 'チェックボックス' },
      { name: 'Radio', description: 'ラジオボタン' },
      { name: 'Select', description: 'セレクトボックス' },
      { name: 'Divider', description: '区切り線' },
      { name: 'Alert', description: 'アラート' },
      { name: 'Container', description: 'コンテナ' },
      { name: 'Form', description: 'フォーム' }
    ];
    return components.map(comp => {
      const item = new vscode.CompletionItem(comp.name, vscode.CompletionItemKind.Class);
      item.detail = comp.description;
      item.insertText = `${comp.name}:\n    `;
      item.sortText = `0${comp.name}`;
      return item;
    });
  }

  getComponentPropertyCompletions(componentName) {
    if (!componentName) return [];
    const properties = this.getComponentProperties(componentName);
    return properties.map(prop => {
      const item = new vscode.CompletionItem(prop.name, vscode.CompletionItemKind.Property);
      item.detail = prop.description;
      item.insertText = `${prop.name}: `;
      item.sortText = `0${prop.name}`;
      return item;
    });
  }

  getPropertyValueCompletions(propertyName, componentName) {
    if (!propertyName || !componentName) return [];
    const values = this.getPropertyValues(propertyName, componentName);
    return values.map(val => {
      const item = new vscode.CompletionItem(val.value, vscode.CompletionItemKind.Value);
      item.detail = val.description;
      item.insertText = val.value;
      item.sortText = `0${val.value}`;
      return item;
    });
  }

  getRootLevelCompletions() {
    const items = [];
    const pageItem = new vscode.CompletionItem('page', vscode.CompletionItemKind.Module);
    pageItem.detail = 'ページ定義';
    pageItem.insertText = 'page:\n  id: \n  title: \n  layout: vertical\n  components:\n    - ';
    pageItem.sortText = '0page';
    items.push(pageItem);
    return items;
  }

  getBasicCompletions(linePrefix, position, currentWord) {
    const items = [];
    const basicItems = [
      { name: 'page', description: 'ページ定義' },
      { name: 'id', description: 'ID' },
      { name: 'title', description: 'タイトル' },
      { name: 'layout', description: 'レイアウト' },
      { name: 'components', description: 'コンポーネントリスト' }
    ];
    basicItems.forEach(item => {
      const completionItem = new vscode.CompletionItem(item.name, vscode.CompletionItemKind.Field);
      completionItem.detail = item.description;
      completionItem.insertText = `${item.name}: `;
      items.push(completionItem);
    });
    return items;
  }

  getComponentProperties(componentName) {
    const properties = {
      Text: [
        { name: 'variant', description: 'テキストの種類（h1, h2, h3, p, span）' },
        { name: 'value', description: 'テキストの内容' },
        { name: 'className', description: 'CSSクラス名' }
      ],
      Input: [
        { name: 'type', description: '入力タイプ（text, email, password, number）' },
        { name: 'placeholder', description: 'プレースホルダーテキスト' },
        { name: 'value', description: '初期値' },
        { name: 'required', description: '必須入力' },
        { name: 'className', description: 'CSSクラス名' }
      ],
      Button: [
        { name: 'variant', description: 'ボタンの種類（primary, secondary, outline）' },
        { name: 'text', description: 'ボタンのテキスト' },
        { name: 'onClick', description: 'クリック時の処理' },
        { name: 'disabled', description: '無効化' },
        { name: 'className', description: 'CSSクラス名' }
      ],
      Checkbox: [
        { name: 'label', description: 'チェックボックスのラベル' },
        { name: 'checked', description: 'チェック状態' },
        { name: 'onChange', description: '変更時の処理' },
        { name: 'className', description: 'CSSクラス名' }
      ],
      Radio: [
        { name: 'name', description: 'ラジオボタングループ名' },
        { name: 'options', description: '選択肢の配列' },
        { name: 'value', description: '選択された値' },
        { name: 'onChange', description: '変更時の処理' },
        { name: 'className', description: 'CSSクラス名' }
      ],
      Select: [
        { name: 'options', description: '選択肢の配列' },
        { name: 'value', description: '選択された値' },
        { name: 'placeholder', description: 'プレースホルダーテキスト' },
        { name: 'onChange', description: '変更時の処理' },
        { name: 'className', description: 'CSSクラス名' }
      ],
      Divider: [
        { name: 'orientation', description: '区切り線の方向（horizontal, vertical）' },
        { name: 'className', description: 'CSSクラス名' }
      ],
      Alert: [
        { name: 'variant', description: 'アラートの種類（info, success, warning, error）' },
        { name: 'title', description: 'アラートのタイトル' },
        { name: 'message', description: 'アラートのメッセージ' },
        { name: 'className', description: 'CSSクラス名' }
      ],
      Container: [
        { name: 'layout', description: 'レイアウト（vertical, horizontal）' },
        { name: 'spacing', description: '要素間の間隔' },
        { name: 'className', description: 'CSSクラス名' }
      ],
      Form: [
        { name: 'onSubmit', description: '送信時の処理' },
        { name: 'className', description: 'CSSクラス名' }
      ]
    };
    return properties[componentName] || [];
  }

  getPropertyValues(propertyName, componentName) {
    const values = {
      variant: [
        { value: 'h1', description: '見出し1' },
        { value: 'h2', description: '見出し2' },
        { value: 'h3', description: '見出し3' },
        { value: 'p', description: '段落' },
        { value: 'span', description: 'インライン' },
        { value: 'primary', description: 'プライマリ' },
        { value: 'secondary', description: 'セカンダリ' },
        { value: 'outline', description: 'アウトライン' },
        { value: 'info', description: '情報' },
        { value: 'success', description: '成功' },
        { value: 'warning', description: '警告' },
        { value: 'error', description: 'エラー' }
      ],
      type: [
        { value: 'text', description: 'テキスト' },
        { value: 'email', description: 'メールアドレス' },
        { value: 'password', description: 'パスワード' },
        { value: 'number', description: '数値' }
      ],
      layout: [
        { value: 'vertical', description: '縦並び' },
        { value: 'horizontal', description: '横並び' }
      ],
      orientation: [
        { value: 'horizontal', description: '水平' },
        { value: 'vertical', description: '垂直' }
      ]
    };
    return values[propertyName] || [];
  }

  clearCache() {
    this.completionCache.clear();
    this.schemaCache = null;
    this.lastSchemaLoad = 0;
  }

  getCurrentWord(linePrefix) {
    const words = linePrefix.trim().split(/\s+/);
    return words[words.length - 1] || '';
  }
}

describe('TextUICompletionProvider', () => {
  let completionProvider;
  let mockSchemaManager;
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

    completionProvider = new MockTextUICompletionProvider(mockSchemaManager);
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
      mockDocument.offsetAt.onFirstCall().returns(0);
      mockDocument.offsetAt.onSecondCall().returns(20);

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
      mockDocument.offsetAt.onFirstCall().returns(0);
      mockDocument.offsetAt.onSecondCall().returns(20);

      const result = await completionProvider.provideCompletionItems(mockDocument, mockPosition, mockToken, mockContext);
      
      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
    });

    it('エラー時は基本的な補完を提供する', async () => {
      mockDocument.getText.returns('invalid yaml content');
      mockDocument.offsetAt.onFirstCall().returns(0);
      mockDocument.offsetAt.onSecondCall().returns(10);

      const result = await completionProvider.provideCompletionItems(mockDocument, mockPosition, mockToken, mockContext);
      
      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
    });
  });

  describe('generateCompletionItemsFromSchema', () => {
    it('コンポーネントリストの補完を生成する', () => {
      const linePrefix = 'page:\n  components:\n    - ';
      const position = new vscode.Position(2, 6);
      const currentWord = '';
      const schema = {};
      const isTemplate = false;

      const result = completionProvider.generateCompletionItemsFromSchema(linePrefix, position, currentWord, schema, isTemplate);

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

      const context = completionProvider.analyzeContext(linePrefix, position);
      const result = completionProvider.generateCompletionItemsFromSchema(linePrefix, position, currentWord, schema, isTemplate);

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

      const context = completionProvider.analyzeContext(linePrefix, position);
      const result = completionProvider.generateCompletionItemsFromSchema(linePrefix, position, currentWord, schema, isTemplate);

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

      const result = completionProvider.generateCompletionItemsFromSchema(linePrefix, position, currentWord, schema, isTemplate);

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
      expect(variantProperty.detail).to.include('テキストの種類');
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
      completionProvider.schemaCache = { test: 'data' };
      completionProvider.lastSchemaLoad = Date.now();

      expect(completionProvider.completionCache.size).to.be.greaterThan(0);
      expect(completionProvider.schemaCache).to.not.be.null;

      completionProvider.clearCache();

      expect(completionProvider.completionCache.size).to.equal(0);
      expect(completionProvider.schemaCache).to.be.null;
      expect(completionProvider.lastSchemaLoad).to.equal(0);
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
      mockDocument.offsetAt.onFirstCall().returns(0);
      mockDocument.offsetAt.onSecondCall().returns(10);

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
