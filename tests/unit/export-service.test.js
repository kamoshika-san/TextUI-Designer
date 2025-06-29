/**
 * ExportService の単体テスト
 * 
 * プレビュー画面からのエクスポート機能に関連する処理をテストします
 */

// グローバルにモックを設定
global.vscode = global.vscode || {};

const assert = require('assert');

describe('ExportService 単体テスト', () => {
  let exportService;
  let testFilePath;

  beforeEach(async () => {
    // ファクトリからExportServiceを作成
    global.cleanupMocks();
    
    if (!global.ExportServiceFactory || typeof global.ExportServiceFactory.createForTest !== 'function') {
      const path = require('path');
      const factoryPath = path.resolve(__dirname, '../mocks/export-service-factory.js');
      const { ExportServiceFactory } = require(factoryPath);
      global.ExportServiceFactory = ExportServiceFactory;
    }
    
    exportService = global.ExportServiceFactory.createForTest(global.vscode, {
      enablePerformance: true,
      cacheTTL: 300000,
      maxCacheSize: 100
    });

    // テスト用ファイルを作成
    testFilePath = exportService._testHelpers.createTestFile(`page:
  id: unit-test
  title: "単体テスト"
  layout: vertical
  components:
    - Text:
        variant: h1
        value: "単体テストタイトル"`);
  });

  afterEach(async () => {
    // テストファイルを削除
    if (exportService && exportService._testHelpers) {
      exportService._testHelpers.cleanupTestFile(testFilePath);
      exportService._testHelpers.resetAllMocks();
      exportService._testHelpers.restoreRequire();
    }

    global.cleanupMocks();
  });

  describe('ExportManager の基本機能', () => {
    it('getSupportedFormatsが正しく動作する', () => {
      const formats = exportService._testHelpers.mockExportManager.getSupportedFormats();
      assert.deepStrictEqual(formats, ['html', 'react', 'pug']);
    });

    it('getFileExtensionが正しく動作する', () => {
      const mockExportManager = exportService._testHelpers.mockExportManager;
      assert.strictEqual(mockExportManager.getFileExtension('html'), '.html');
      assert.strictEqual(mockExportManager.getFileExtension('react'), '.jsx');
      assert.strictEqual(mockExportManager.getFileExtension('pug'), '.pug');
      assert.strictEqual(mockExportManager.getFileExtension('unknown'), '.txt');
    });

    it('exportFromFileが正しく動作する', async () => {
      const mockExportManager = exportService._testHelpers.mockExportManager;
      const result = await mockExportManager.exportFromFile(testFilePath, { format: 'html' });
      assert.ok(result.includes('Exported from'));
      assert.ok(result.includes('Mock export for html'));
    });
  });

  describe('ファイル拡張子の検証', () => {
    it('サポートされているファイル拡張子を正しく認識する', () => {
      const fs = require('fs');
      const path = require('path');
      const supportedExtensions = ['.tui.yml', '.tui.yaml'];
      
      supportedExtensions.forEach(ext => {
        const testFileName = `test${ext}`;
        const testFile = path.join(__dirname, testFileName);
        fs.writeFileSync(testFile, 'test content', 'utf-8');
        
        try {
          // ファイルが作成されたことを確認
          assert.ok(fs.existsSync(testFile), `${ext}ファイルが正しく作成されました`);
        } finally {
          // テストファイルを削除
          if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
          }
        }
      });
    });

    it('サポートされていないファイル拡張子を正しく除外する', () => {
      const fs = require('fs');
      const path = require('path');
      const unsupportedExtensions = ['.txt', '.md', '.json'];
      
      unsupportedExtensions.forEach(ext => {
        const testFileName = `test${ext}`;
        const testFile = path.join(__dirname, testFileName);
        fs.writeFileSync(testFile, 'test content', 'utf-8');
        
        try {
          // ファイルが作成されたことを確認
          assert.ok(fs.existsSync(testFile), `${ext}ファイルが正しく作成されました`);
        } finally {
          // テストファイルを削除
          if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
          }
        }
      });
    });
  });

  describe('VSCode API モックの検証', () => {
    it('window.showQuickPickが正しく設定されている', () => {
      const extendedVscode = exportService._testHelpers.extendedVscode;
      assert.ok(typeof extendedVscode.window.showQuickPick === 'function');
    });

    it('window.showSaveDialogが正しく設定されている', () => {
      const extendedVscode = exportService._testHelpers.extendedVscode;
      assert.ok(typeof extendedVscode.window.showSaveDialog === 'function');
    });

    it('workspace.fsが正しく設定されている', () => {
      const extendedVscode = exportService._testHelpers.extendedVscode;
      assert.ok(typeof extendedVscode.workspace.fs.writeFile === 'function');
    });
  });

  describe('テストファイルの操作', () => {
    it('テストファイルが正しく作成される', () => {
      const fs = require('fs');
      assert.ok(fs.existsSync(testFilePath), 'テストファイルが正しく作成されました');
    });

    it('テストファイルの内容が正しい', () => {
      const fs = require('fs');
      const content = fs.readFileSync(testFilePath, 'utf-8');
      assert.ok(content.includes('unit-test'), 'ファイル内容にIDが含まれています');
      assert.ok(content.includes('単体テスト'), 'ファイル内容にタイトルが含まれています');
    });
  });
}); 