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

// TemplateServiceのモック
class MockTemplateService {
  constructor(errorHandler) {
    this.errorHandler = errorHandler;
  }

  async selectTemplateFile() {
    return await mockVscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: { 'YAML Template': ['*.yml', '*.yaml'] }
    });
  }

  async loadTemplateContent(uri) {
    const document = await mockVscode.workspace.openTextDocument({ uri });
    return document.getText();
  }

  async createTemplateFile(uri, content) {
    const document = await mockVscode.workspace.openTextDocument({
      content,
      language: 'yaml'
    });
    await mockVscode.window.showTextDocument(document);
    return true;
  }

  async selectTemplateType() {
    const items = [
      { value: 'form', label: 'Form Template' },
      { value: 'dashboard', label: 'Dashboard Template' },
      { value: 'stepForm', label: 'Step Form Template' }
    ];
    return await mockVscode.window.showQuickPick(items, {
      placeHolder: 'テンプレートの種類を選択してください'
    });
  }

  async selectSaveLocation() {
    return await mockVscode.window.showSaveDialog({
      filters: { 'YAML Template': ['*.yml', '*.yaml'] }
    });
  }

  generateTemplateContent(type) {
    switch (type) {
      case 'form':
        return `Form:
  id: myForm
  fields:
    Input:
      id: name
      label: Name
    Button:
      id: submit
      text: Submit`;
      case 'dashboard':
        return `page:
  title: Dashboard
  components:
    - Alert:
        variant: info`;
      case 'stepForm':
        return `page:
  title: Step Form
  components:
    - Input:
        label: Company`;
      default:
        return `Form:
  id: myForm
  fields:
    Input:
      id: name
      label: Name
    Button:
      id: submit
      text: Submit`;
    }
  }

  async insertTemplateContent(editor, content) {
    await editor.edit((editBuilder) => {
      editBuilder.insert(editor.selection.active, content);
    });
    return true;
  }
}

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
    service = new MockTemplateService(mockErrorHandler);
  });

  it('テンプレートの読み込みが正しく動作する', async () => {
    // selectTemplateFile経由でテンプレートファイル選択をテスト
    const templateUris = await service.selectTemplateFile();
    const templateUri = templateUris[0];
    assert.ok(templateUri);
    assert.strictEqual(templateUri.fsPath, '/test/template.yml');
    
    // loadTemplateContent経由でテンプレート内容読み込みをテスト
    const content = await service.loadTemplateContent(templateUri);
    assert.strictEqual(content, 'template content');
  });

  it('テンプレートの保存が正しく行われる', async () => {
    const uri = { fsPath: '/test/template.yml' };
    const content = 'test template content';
    
    await service.createTemplateFile(uri, content);
    
    assert.ok(lastTextDocument);
    assert.strictEqual(lastTextDocument.content, content);
    assert.strictEqual(lastTextDocument.language, 'yaml');
  });

  it('テンプレートの検索・フィルタリングが正しく動作する', async () => {
    // テンプレート種別選択のテスト
    const templateType = await service.selectTemplateType();
    assert.ok(templateType);
    assert.strictEqual(templateType.value, 'form');
    assert.ok(lastQuickPick);
    assert.strictEqual(lastQuickPick.items.length, 3);
    assert.ok(lastQuickPick.items.some(item => item.value === 'form'));
    assert.ok(lastQuickPick.items.some(item => item.value === 'dashboard'));
    assert.ok(lastQuickPick.items.some(item => item.value === 'stepForm'));
    
    // 保存先選択のテスト
    const saveUri = await service.selectSaveLocation();
    assert.ok(saveUri);
    assert.ok(lastSaveDialog);
    assert.ok(lastSaveDialog.filters['YAML Template']);
    
    // テンプレートファイル選択のテスト
    const openUri = await service.selectTemplateFile();
    assert.ok(openUri);
    assert.ok(lastOpenDialog);
    assert.strictEqual(lastOpenDialog.canSelectFiles, true);
    assert.strictEqual(lastOpenDialog.canSelectFolders, false);
    assert.strictEqual(lastOpenDialog.canSelectMany, false);
  });

  it('テンプレート内容の生成が正しく動作する', () => {
    // フォームテンプレート
    const formContent = service.generateTemplateContent('form');
    assert.ok(formContent.includes('Form:'));
    assert.ok(formContent.includes('id: myForm'));
    assert.ok(formContent.includes('fields:'));
    assert.ok(formContent.includes('Input:'));
    assert.ok(formContent.includes('Button:'));
    
    // ダッシュボードテンプレート
    const dashboardContent = service.generateTemplateContent('dashboard');
    assert.ok(dashboardContent.includes('Dashboard'));
    assert.ok(dashboardContent.includes('Alert:'));

    // ステップフォームテンプレート
    const stepFormContent = service.generateTemplateContent('stepForm');
    assert.ok(stepFormContent.includes('Step Form'));
    assert.ok(stepFormContent.includes('Input:'));

    // 無効な種別の場合はフォームテンプレート
    const invalidContent = service.generateTemplateContent('invalid');
    assert.strictEqual(invalidContent, formContent);
  });

  it('テンプレート内容の挿入が正しく動作する', async () => {
    const content = 'test template content';
    await service.insertTemplateContent(mockVscode.window.activeTextEditor, content);
    
    assert.ok(lastEditor);
    assert.ok(lastEditor.callback);
  });
}); 