const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs');

// テスト用モック
const mockErrorHandler = {
  withErrorHandling: sinon.stub()
};

// モジュールのモック
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === '../../out/utils/error-handler.js') {
    return mockErrorHandler;
  }
  return originalRequire.apply(this, arguments);
};

describe('RefactoredTemplateParser', () => {
  let RefactoredTemplateParser;
  let parser;
  let testBasePath;

  beforeEach(function () {
    // ErrorHandlerのモックをリセット
    mockErrorHandler.withErrorHandling.reset();
    mockErrorHandler.withErrorHandling.callsFake(async (operation, context) => {
      return await operation();
    });

    // テスト用パスの設定
    testBasePath = path.join(__dirname, 'test-file.tui.yml');

    // RefactoredTemplateParserをインポート
    RefactoredTemplateParser = require('../../out/services/template-parser/refactored-template-parser').RefactoredTemplateParser;
    parser = new RefactoredTemplateParser();
  });

  afterEach(() => {
    if (parser) {
      parser.dispose();
    }
  });

  describe('基本的な機能', () => {
    it('シンプルなYAMLをパースできる', async () => {
      const yamlContent = `
        Text:
          content: "Hello World"
          style: "heading"
      `;

      const result = await parser.parseWithTemplates(yamlContent, testBasePath);
      
      expect(result).to.have.property('Text');
      expect(result.Text).to.have.property('content', 'Hello World');
      expect(result.Text).to.have.property('style', 'heading');
    });

    it('配列を含むYAMLをパースできる', async () => {
      const yamlContent = `
        components:
          - Text:
              content: "Item 1"
          - Text:
              content: "Item 2"
      `;

      const result = await parser.parseWithTemplates(yamlContent, testBasePath);
      
      expect(result).to.have.property('components');
      expect(result.components).to.be.an('array');
      expect(result.components).to.have.length(2);
      expect(result.components[0].Text.content).to.equal('Item 1');
      expect(result.components[1].Text.content).to.equal('Item 2');
    });

    it('ネストしたオブジェクトをパースできる', async () => {
      const yamlContent = `
        Container:
          layout: "vertical"
          components:
            - Text:
                content: "Nested content"
      `;

      const result = await parser.parseWithTemplates(yamlContent, testBasePath);
      
      expect(result).to.have.property('Container');
      expect(result.Container).to.have.property('layout', 'vertical');
      expect(result.Container).to.have.property('components');
      expect(result.Container.components[0].Text.content).to.equal('Nested content');
    });
  });

  describe('キャッシュ機能', () => {
    it('キャッシュ統計を取得できる', () => {
      const stats = parser.getCacheStats();
      expect(stats).to.be.an('object');
    });

    it('キャッシュをクリアできる', () => {
      expect(() => parser.clearCache()).to.not.throw();
    });

    it('特定のテンプレートキャッシュを無効化できる', () => {
      expect(() => parser.invalidateTemplateCache('test.template.yml')).to.not.throw();
    });
  });

  describe('検証機能', () => {
    it('テンプレートパスの検証ができる', async () => {
      // 存在しないファイルの検証
      const isValid = await parser.validateTemplatePath('nonexistent.template.yml', testBasePath);
      expect(isValid).to.be.false;
    });

    it('循環参照を検出できる', () => {
      const content = `
        $include: template1.yml
        components:
          - $include: template2.yml
      `;

      const references = parser.detectCircularReferences(content, testBasePath);
      expect(references).to.be.an('array');
    });
  });

  describe('エラーハンドリング', () => {
    it('エラー時に例外がcatchできる', async () => {
      const invalidYaml = `
        Text:
          content: "Hello World"
          style: "heading"
        - invalid: yaml: structure
      `;

      let caught = false;
      try {
        await parser.parseWithTemplates(invalidYaml, testBasePath);
      } catch (error) {
        caught = true;
      }
      expect(caught).to.be.true;
    });
  });

  describe('リソース管理', () => {
    it('dispose()でリソースを適切にクリーンアップする', () => {
      expect(() => parser.dispose()).to.not.throw();
    });
  });
}); 