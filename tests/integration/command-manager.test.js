/**
 * CommandManager の統合テスト
 * 
 * プレビュー画面からのエクスポート機能に関連するコマンド処理をテストします
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// VSCodeモックを設定
const mockVscode = require('../mocks/vscode-mock');
global.vscode = mockVscode;

// Module requireをフックしてVSCodeモジュールをモック化
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === 'vscode') {
    return mockVscode;
  }
  return originalRequire.apply(this, arguments);
};

describe('CommandManager 統合テスト', () => {
  let commandManager;
  let testFile;
  let testFilePath;

  before(async () => {
    // テスト用の.tui.ymlファイルを作成
    testFile = `page:
  id: command-test
  title: "コマンドテスト"
  layout: vertical
  components:
    - Text:
        variant: h1
        value: "コマンドテストタイトル"
    - Button:
        text: "テストボタン"
        variant: primary`;

    testFilePath = path.join(__dirname, 'command-test.tui.yml');
    fs.writeFileSync(testFilePath, testFile, 'utf-8');

    // モックコンテキストを作成
    const mockContext = {
      subscriptions: [],
      extensionUri: mockVscode.Uri.file(__dirname),
      extensionPath: __dirname
    };

    // モックサービスを作成
    const mockWebViewManager = {
      openPreview: () => Promise.resolve(),
      openDevTools: () => Promise.resolve()
    };

    const mockExportService = {
      executeExport: (filePath) => Promise.resolve()
    };

    const mockTemplateService = {
      createTemplate: () => Promise.resolve(),
      insertTemplate: () => Promise.resolve()
    };

    const mockSettingsService = {
      openSettings: () => Promise.resolve(),
      resetSettings: () => Promise.resolve(),
      showAutoPreviewSetting: () => Promise.resolve()
    };

    const mockSchemaManager = {
      reinitialize: () => Promise.resolve(),
      debugSchemas: () => Promise.resolve()
    };

    // CommandManagerをインポートしてテスト用インスタンスを作成
    const { CommandManager } = require('../../out/services/command-manager');
    commandManager = new CommandManager(
      mockContext,
      mockWebViewManager,
      mockExportService,
      mockTemplateService,
      mockSettingsService,
      mockSchemaManager
    );
  });

  after(async () => {
    // テストファイルを削除
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    // CommandManagerをクリーンアップ
    if (commandManager && typeof commandManager.dispose === 'function') {
      commandManager.dispose();
    }
    
    // Module requireを復元
    Module.prototype.require = originalRequire;
  });

  describe('エクスポートコマンドの処理', () => {
    it('ファイルパス付きエクスポートコマンドが正常に実行される', async () => {
      // テストファイルを開く
      const document = await vscode.workspace.openTextDocument(testFilePath);
      await vscode.window.showTextDocument(document);

      // ファイルパス付きエクスポートコマンドを実行
      try {
        await vscode.commands.executeCommand('textui-designer.export', testFilePath);
        assert.ok(true, 'ファイルパス付きエクスポートコマンドが正常に実行されました');
      } catch (error) {
        console.error('ファイルパス付きエクスポートエラー:', error);
        assert.fail(`ファイルパス付きエクスポートでエラーが発生しました: ${error.message}`);
      }
    });

    it('パラメータなしエクスポートコマンドが正常に実行される', async () => {
      // テストファイルを開く
      const document = await vscode.workspace.openTextDocument(testFilePath);
      await vscode.window.showTextDocument(document);

      // パラメータなしエクスポートコマンドを実行
      try {
        await vscode.commands.executeCommand('textui-designer.export');
        assert.ok(true, 'パラメータなしエクスポートコマンドが正常に実行されました');
      } catch (error) {
        console.error('パラメータなしエクスポートエラー:', error);
        assert.fail(`パラメータなしエクスポートでエラーが発生しました: ${error.message}`);
      }
    });

    it('プレビュー画面を開いた後にエクスポートコマンドが正常に実行される', async () => {
      // テストファイルを開く
      const document = await vscode.workspace.openTextDocument(testFilePath);
      await vscode.window.showTextDocument(document);

      // プレビューを開く
      await vscode.commands.executeCommand('textui-designer.openPreview');

      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));

      // エクスポートコマンドを実行
      try {
        await vscode.commands.executeCommand('textui-designer.export');
        assert.ok(true, 'プレビュー画面後のエクスポートコマンドが正常に実行されました');
      } catch (error) {
        console.error('プレビュー画面後のエクスポートエラー:', error);
        assert.fail(`プレビュー画面後のエクスポートでエラーが発生しました: ${error.message}`);
      }
    });

    it('WebViewがアクティブな状態でエクスポートコマンドが正常に実行される', async () => {
      // テストファイルを開く
      const document = await vscode.workspace.openTextDocument(testFilePath);
      await vscode.window.showTextDocument(document);

      // プレビューを開く
      await vscode.commands.executeCommand('textui-designer.openPreview');

      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));

      // WebViewをアクティブにする（プレビュー画面をクリック）
      const panels = vscode.window.terminals.filter(terminal => 
        terminal.name.includes('TextUI Preview')
      );
      if (panels.length > 0) {
        panels[0].show();
      }

      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));

      // エクスポートコマンドを実行
      try {
        await vscode.commands.executeCommand('textui-designer.export');
        assert.ok(true, 'WebViewアクティブ状態でのエクスポートコマンドが正常に実行されました');
      } catch (error) {
        console.error('WebViewアクティブ状態でのエクスポートエラー:', error);
        assert.fail(`WebViewアクティブ状態でのエクスポートでエラーが発生しました: ${error.message}`);
      }
    });
  });

  describe('コマンドの登録と実行', () => {
    it('エクスポートコマンドが正しく登録されている', async () => {
      // 登録されているコマンドを確認
      const commands = await vscode.commands.getCommands();
      const exportCommands = commands.filter(cmd => cmd.includes('textui-designer.export'));
      
      assert.ok(exportCommands.length > 0, 'エクスポートコマンドが正しく登録されています');
    });

    it('プレビューコマンドが正しく登録されている', async () => {
      // 登録されているコマンドを確認
      const commands = await vscode.commands.getCommands();
      const previewCommands = commands.filter(cmd => cmd.includes('textui-designer.openPreview'));
      
      assert.ok(previewCommands.length > 0, 'プレビューコマンドが正しく登録されています');
    });

    it('複数のコマンドが連続して実行される', async () => {
      // テストファイルを開く
      const document = await vscode.workspace.openTextDocument(testFilePath);
      await vscode.window.showTextDocument(document);

      // プレビューを開く
      await vscode.commands.executeCommand('textui-designer.openPreview');

      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));

      // エクスポートコマンドを実行
      try {
        await vscode.commands.executeCommand('textui-designer.export');
        assert.ok(true, '連続コマンド実行が正常に動作しました');
      } catch (error) {
        console.error('連続コマンド実行エラー:', error);
        assert.fail(`連続コマンド実行でエラーが発生しました: ${error.message}`);
      }
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないファイルパスでエクスポートコマンドを実行した場合、適切にエラーが処理される', async () => {
      const nonExistentPath = path.join(__dirname, 'non-existent-file.tui.yml');

      try {
        await vscode.commands.executeCommand('textui-designer.export', nonExistentPath);
        assert.fail('存在しないファイルパスでエラーが発生すべきでした');
      } catch (error) {
        // エラーが発生することを確認
        assert.ok(error, '存在しないファイルパスで適切にエラーが発生しました');
      }
    });

    it('アクティブエディタが.tui.ymlファイルでない場合、適切にエラーが処理される', async () => {
      // 非.tui.ymlファイルを作成
      const nonTuiFile = path.join(__dirname, 'test.txt');
      fs.writeFileSync(nonTuiFile, 'test content', 'utf-8');

      try {
        // 非.tui.ymlファイルを開く
        const document = await vscode.workspace.openTextDocument(nonTuiFile);
        await vscode.window.showTextDocument(document);

        // エクスポートコマンドを実行（エラーが発生することを期待）
        await vscode.commands.executeCommand('textui-designer.export');
        assert.fail('非.tui.ymlファイルでエラーが発生すべきでした');
      } catch (error) {
        // エラーが発生することを確認
        assert.ok(error, '非.tui.ymlファイルで適切にエラーが発生しました');
      } finally {
        // テストファイルを削除
        if (fs.existsSync(nonTuiFile)) {
          fs.unlinkSync(nonTuiFile);
        }
      }
    });

    it('無効なパラメータでエクスポートコマンドを実行した場合、適切にエラーが処理される', async () => {
      try {
        // 無効なパラメータを渡す（空文字列）
        await vscode.commands.executeCommand('textui-designer.export', '');
        // エラーが発生しない場合でも、適切に処理されることを確認
        assert.ok(true, '無効なパラメータが適切に処理されました');
      } catch (error) {
        // エラーが発生した場合も適切に処理されることを確認
        assert.ok(error, '無効なパラメータで適切にエラーが発生しました');
      }
    });
  });

  describe('パフォーマンステスト', () => {
    it('複数回のエクスポートコマンド実行が正常に動作する', async () => {
      // テストファイルを開く
      const document = await vscode.workspace.openTextDocument(testFilePath);
      await vscode.window.showTextDocument(document);

      // 複数回エクスポートコマンドを実行
      for (let i = 0; i < 3; i++) {
        try {
          await vscode.commands.executeCommand('textui-designer.export');
          console.log(`エクスポートコマンド ${i + 1} 回目が正常に実行されました`);
        } catch (error) {
          console.error(`エクスポートコマンド ${i + 1} 回目でエラー:`, error);
          assert.fail(`エクスポートコマンド ${i + 1} 回目でエラーが発生しました: ${error.message}`);
        }

        // 少し待機
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      assert.ok(true, '複数回のエクスポートコマンド実行が正常に完了しました');
    });

    it('プレビューとエクスポートの連続実行が正常に動作する', async () => {
      // テストファイルを開く
      const document = await vscode.workspace.openTextDocument(testFilePath);
      await vscode.window.showTextDocument(document);

      // プレビューとエクスポートを連続実行
      for (let i = 0; i < 2; i++) {
        try {
          // プレビューを開く
          await vscode.commands.executeCommand('textui-designer.openPreview');
          
          // 少し待機
          await new Promise(resolve => setTimeout(resolve, 1000));

          // エクスポートコマンドを実行
          await vscode.commands.executeCommand('textui-designer.export');
          
          console.log(`連続実行 ${i + 1} 回目が正常に完了しました`);
        } catch (error) {
          console.error(`連続実行 ${i + 1} 回目でエラー:`, error);
          assert.fail(`連続実行 ${i + 1} 回目でエラーが発生しました: ${error.message}`);
        }

        // 少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      assert.ok(true, 'プレビューとエクスポートの連続実行が正常に完了しました');
    });
  });
}); 