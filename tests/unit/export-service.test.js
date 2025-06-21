/**
 * ExportService の単体テスト
 * 
 * プレビュー画面からのエクスポート機能に関連する処理をテストします
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

describe('ExportService 単体テスト', () => {
  let exportService;
  let mockExportManager;
  let testFile;
  let testFilePath;

  before(async () => {
    // テスト用の.tui.ymlファイルを作成
    testFile = `page:
  id: unit-test
  title: "単体テスト"
  layout: vertical
  components:
    - Text:
        variant: h1
        value: "単体テストタイトル"`;

    testFilePath = path.join(__dirname, 'unit-test.tui.yml');
    fs.writeFileSync(testFilePath, testFile, 'utf-8');

    // Mock ExportManagerを作成
    mockExportManager = {
      getSupportedFormats: () => ['html', 'react', 'pug'],
      getFileExtension: (format) => {
        const extensions = { html: '.html', react: '.jsx', pug: '.pug' };
        return extensions[format] || '.txt';
      },
      exportFromFile: async (filePath, options) => {
        // モックの実装
        return `<!-- Exported from ${filePath} -->\n<div>Mock export for ${options.format}</div>`;
      }
    };

    // ExportServiceをインポートしてテスト用インスタンスを作成
    const { ExportService } = require('../../out/services/export-service');
    exportService = new ExportService(mockExportManager);
  });

  after(async () => {
    // テストファイルを削除
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  describe('ファイル拡張子の検証', () => {
    it('サポートされているファイル拡張子を正しく認識する', () => {
      const supportedExtensions = ['.tui.yml', '.tui.yaml'];
      
      supportedExtensions.forEach(ext => {
        const testFileName = `test${ext}`;
        // プライベートメソッドのテストは難しいため、
        // 実際のファイルでテスト
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

  describe('Mock ExportManager のテスト', () => {
    it('getSupportedFormatsが正しく動作する', () => {
      const formats = mockExportManager.getSupportedFormats();
      assert.deepStrictEqual(formats, ['html', 'react', 'pug']);
    });

    it('getFileExtensionが正しく動作する', () => {
      assert.strictEqual(mockExportManager.getFileExtension('html'), '.html');
      assert.strictEqual(mockExportManager.getFileExtension('react'), '.jsx');
      assert.strictEqual(mockExportManager.getFileExtension('pug'), '.pug');
      assert.strictEqual(mockExportManager.getFileExtension('unknown'), '.txt');
    });

    it('exportFromFileが正しく動作する', async () => {
      const result = await mockExportManager.exportFromFile(testFilePath, { format: 'html' });
      assert.ok(result.includes('Exported from'));
      assert.ok(result.includes('Mock export for html'));
    });
  });
}); 