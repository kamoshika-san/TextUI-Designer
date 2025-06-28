/**
 * TemplateServiceの基本テスト
 */
const assert = require('assert');
const { describe, it, beforeEach } = require('mocha');

// VSCode APIとErrorHandlerのモック
let infoMessages = [];
let errorMessages = [];
const mockErrorHandler = {
  executeSafely: async (fn) => { try { await fn(); return true; } catch { return false; } },
  showInfo: (msg) => infoMessages.push(msg),
  showError: (msg) => errorMessages.push(msg)
};

let lastQuickPick;
let lastSaveDialog;
let lastOpenDialog;
let lastTextDocument;
let lastEditor;
const mockVscode = {
  window: {
    showQuickPick: async (items, options) => { 
      lastQuickPick = { items, options }; 
      return items[0]; // デフォルトで最初のアイテムを返す
    },
    showSaveDialog: async (options) => { 
      lastSaveDialog = options; 
      return { fsPath: '/test/template.yml' }; 
    },
    showOpenDialog: async (options) => { 
      lastOpenDialog = options; 
      return [{ fsPath: '/test/template.yml' }]; 
    },
    showTextDocument: async (document) => { 
      lastTextDocument = document; 
      return { edit: async () => {} }; 
    },
    activeTextEditor: {
      selection: { active: { line: 0, character: 0 } },
      edit: async (callback) => {
        lastEditor = { callback };
        callback({ insert: () => {} });
      }
    }
  },
  workspace: {
    openTextDocument: async (options) => {
      // 渡されたoptionsをそのまま返すように修正
      return {
        getText: () => 'template content',
        save: async () => {},
        content: options.content,
        language: options.language
      };
    }
  },
  Uri: {
    file: (path) => ({ fsPath: path })
  }
};

// requireフックで依存を差し替え
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id.endsWith('error-handler')) return mockErrorHandler;
  if (id === 'vscode') return mockVscode;
  return originalRequire.apply(this, arguments);
};

const { TemplateService } = require('../../src/services/template-service.ts');

describe('TemplateService', () => {
  let service;
  beforeEach(() => {
    // 各テスト前に状態リセット
    infoMessages = [];
    errorMessages = [];
    lastQuickPick = null;
    lastSaveDialog = null;
    lastOpenDialog = null;
    lastTextDocument = null;
    lastEditor = null;
    service = new TemplateService(mockErrorHandler);
  });

  it('テンプレートの読み込みが正しく動作する', async () => {
    // selectTemplateFile経由でテンプレートファイル選択をテスト
    const templateUri = await service["selectTemplateFile"].call(service);
    assert.ok(templateUri);
    assert.strictEqual(templateUri.fsPath, '/test/template.yml');
    
    // loadTemplateContent経由でテンプレート内容読み込みをテスト
    const content = await service["loadTemplateContent"].call(service, templateUri);
    assert.strictEqual(content, 'template content');
  });

  it('テンプレートの保存が正しく行われる', async () => {
    const uri = { fsPath: '/test/template.yml' };
    const content = 'test template content';
    
    await service["createTemplateFile"].call(service, uri, content);
    
    assert.ok(lastTextDocument);
    assert.strictEqual(lastTextDocument.content, content);
    assert.strictEqual(lastTextDocument.language, 'yaml');
  });

  it('テンプレートの検索・フィルタリングが正しく動作する', async () => {
    // テンプレート種別選択のテスト
    const templateType = await service["selectTemplateType"].call(service);
    assert.ok(templateType);
    assert.strictEqual(templateType.value, 'form');
    assert.ok(lastQuickPick);
    assert.strictEqual(lastQuickPick.items.length, 3);
    assert.ok(lastQuickPick.items.some(item => item.value === 'form'));
    assert.ok(lastQuickPick.items.some(item => item.value === 'list'));
    assert.ok(lastQuickPick.items.some(item => item.value === 'empty'));
    
    // 保存先選択のテスト
    const saveUri = await service["selectSaveLocation"].call(service);
    assert.ok(saveUri);
    assert.ok(lastSaveDialog);
    assert.ok(lastSaveDialog.filters['YAML Template']);
    
    // テンプレートファイル選択のテスト
    const openUri = await service["selectTemplateFile"].call(service);
    assert.ok(openUri);
    assert.ok(lastOpenDialog);
    assert.strictEqual(lastOpenDialog.canSelectFiles, true);
    assert.strictEqual(lastOpenDialog.canSelectFolders, false);
    assert.strictEqual(lastOpenDialog.canSelectMany, false);
  });

  it('テンプレート内容の生成が正しく動作する', () => {
    // フォームテンプレート
    const formContent = service["generateTemplateContent"].call(service, 'form');
    assert.ok(formContent.includes('Form:'));
    assert.ok(formContent.includes('id: myForm'));
    assert.ok(formContent.includes('fields:'));
    assert.ok(formContent.includes('Input:'));
    assert.ok(formContent.includes('Button:'));
    
    // 一覧テンプレート
    const listContent = service["generateTemplateContent"].call(service, 'list');
    assert.ok(listContent.includes('Container:'));
    assert.ok(listContent.includes('layout: vertical'));
    assert.ok(listContent.includes('Text:'));
    assert.ok(listContent.includes('Divider:'));
    
    // 空テンプレート
    const emptyContent = service["generateTemplateContent"].call(service, 'empty');
    assert.ok(emptyContent.includes('Container:'));
    assert.ok(emptyContent.includes('components:'));
    
    // 無効な種別の場合は空テンプレート
    const invalidContent = service["generateTemplateContent"].call(service, 'invalid');
    assert.strictEqual(invalidContent, emptyContent);
  });

  it('テンプレート内容の挿入が正しく動作する', async () => {
    const content = 'test template content';
    await service["insertTemplateContent"].call(service, mockVscode.window.activeTextEditor, content);
    
    assert.ok(lastEditor);
    assert.ok(lastEditor.callback);
  });
}); 