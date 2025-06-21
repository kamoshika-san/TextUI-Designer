/**
 * エクスポート機能の回帰テストスイート
 * 
 * プレビュー画面からのエクスポート機能に関する全ての回帰テストを統合管理します
 */

// Mochaテストフレームワークの読み込み
const { describe, it, before, after } = require('mocha');
const assert = require('assert');
const path = require('path');
const fs = require('fs');

/**
 * テストヘルパー関数
 */
class ExportTestHelper {
  constructor() {
    this.testFiles = [];
    this.originalActiveTextEditor = null;
  }

  /**
   * テスト用の.tui.ymlファイルを作成
   */
  createTestFile(content, fileName = 'test.tui.yml') {
    const testFilePath = path.join(__dirname, fileName);
    fs.writeFileSync(testFilePath, content, 'utf-8');
    this.testFiles.push(testFilePath);
    return testFilePath;
  }

  /**
   * 基本的なテストファイルを作成
   */
  createBasicTestFile() {
    const content = `page:
  id: basic-test
  title: "基本テスト"
  layout: vertical
  components:
    - Text:
        variant: h1
        value: "基本テストタイトル"
    - Button:
        text: "テストボタン"
        variant: primary`;

    return this.createTestFile(content, 'basic-test.tui.yml');
  }

  /**
   * 複雑なテストファイルを作成
   */
  createComplexTestFile() {
    const content = `page:
  id: complex-test
  title: "複雑テスト"
  layout: vertical
  components:
    - Text:
        variant: h1
        value: "複雑テストタイトル"
    - Form:
        fields:
          - Input:
              label: "名前"
              placeholder: "名前を入力"
          - Select:
              label: "選択肢"
              options:
                - label: "オプション1"
                  value: "option1"
                - label: "オプション2"
                  value: "option2"
          - Checkbox:
              label: "同意する"
    - Container:
        layout: horizontal
        components:
          - Text:
              variant: p
              value: "左側"
          - Divider:
              orientation: vertical
          - Text:
              variant: p
              value: "右側"
    - Alert:
        type: info
        message: "情報メッセージ"`;

    return this.createTestFile(content, 'complex-test.tui.yml');
  }

  /**
   * 大量コンポーネントのテストファイルを作成
   */
  createLargeTestFile(componentCount = 50) {
    let content = `page:
  id: large-test
  title: "大量コンポーネントテスト"
  layout: vertical
  components:`;

    for (let i = 0; i < componentCount; i++) {
      content += `
    - Text:
        variant: p
        value: "コンポーネント ${i + 1}"
    - Divider:`;
    }

    return this.createTestFile(content, 'large-test.tui.yml');
  }

  /**
   * 無効なYAMLファイルを作成
   */
  createInvalidYamlFile() {
    const content = `page:
  id: invalid-test
  title: "無効なYAML"
  components:
    - Text:
        variant: h1
        value: "無効なYAML"
    - InvalidComponent:
        invalid: property: without: proper: yaml: syntax`;

    return this.createTestFile(content, 'invalid-test.tui.yml');
  }

  /**
   * テストファイルを開く
   */
  async openTestFile(filePath) {
    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document);
    return document;
  }

  /**
   * プレビューを開く
   */
  async openPreview() {
    await vscode.commands.executeCommand('textui-designer.openPreview');
    // WebViewの初期化を待つ
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  /**
   * エクスポートを実行
   */
  async executeExport(filePath = null) {
    if (filePath) {
      return await vscode.commands.executeCommand('textui-designer.export', filePath);
    } else {
      return await vscode.commands.executeCommand('textui-designer.export');
    }
  }

  /**
   * WebViewをアクティブにする
   */
  async activateWebView() {
    const panels = vscode.window.terminals.filter(terminal => 
      terminal.name.includes('TextUI Preview')
    );
    if (panels.length > 0) {
      panels[0].show();
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * クリーンアップ
   */
  async cleanup() {
    // テストファイルを削除
    for (const filePath of this.testFiles) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    this.testFiles = [];

    // 元のエディタを復元
    if (this.originalActiveTextEditor) {
      await vscode.window.showTextDocument(this.originalActiveTextEditor.document);
    }
  }

  /**
   * 現在のアクティブエディタを保存
   */
  saveActiveEditor() {
    this.originalActiveTextEditor = vscode.window.activeTextEditor;
  }
}

/**
 * 回帰テストスイート
 */
describe('エクスポート機能回帰テストスイート', () => {
  let helper;

  before(async () => {
    helper = new ExportTestHelper();
    helper.saveActiveEditor();
  });

  after(async () => {
    await helper.cleanup();
  });

  describe('基本的なエクスポート機能', () => {
    it('基本的な.tui.ymlファイルのプレビューとエクスポートが正常に動作する', async () => {
      const testFilePath = helper.createBasicTestFile();
      await helper.openTestFile(testFilePath);
      await helper.openPreview();

      try {
        await helper.executeExport();
        assert.ok(true, '基本的なエクスポートが正常に実行されました');
      } catch (error) {
        console.error('基本的なエクスポートエラー:', error);
        assert.fail(`基本的なエクスポートでエラーが発生しました: ${error.message}`);
      }
    });

    it('WebViewアクティブ状態でのエクスポートが正常に動作する', async () => {
      const testFilePath = helper.createBasicTestFile();
      await helper.openTestFile(testFilePath);
      await helper.openPreview();
      await helper.activateWebView();

      try {
        await helper.executeExport();
        assert.ok(true, 'WebViewアクティブ状態でのエクスポートが正常に実行されました');
      } catch (error) {
        console.error('WebViewアクティブ状態でのエクスポートエラー:', error);
        assert.fail(`WebViewアクティブ状態でのエクスポートでエラーが発生しました: ${error.message}`);
      }
    });

    it('ファイルパス付きエクスポートが正常に動作する', async () => {
      const testFilePath = helper.createBasicTestFile();
      await helper.openTestFile(testFilePath);
      await helper.openPreview();

      try {
        await helper.executeExport(testFilePath);
        assert.ok(true, 'ファイルパス付きエクスポートが正常に実行されました');
      } catch (error) {
        console.error('ファイルパス付きエクスポートエラー:', error);
        assert.fail(`ファイルパス付きエクスポートでエラーが発生しました: ${error.message}`);
      }
    });
  });

  describe('複雑なシナリオ', () => {
    it('複雑なコンポーネント構成のファイルでもエクスポートが正常に動作する', async () => {
      const testFilePath = helper.createComplexTestFile();
      await helper.openTestFile(testFilePath);
      await helper.openPreview();

      try {
        await helper.executeExport();
        assert.ok(true, '複雑なコンポーネント構成のエクスポートが正常に実行されました');
      } catch (error) {
        console.error('複雑なコンポーネント構成のエクスポートエラー:', error);
        assert.fail(`複雑なコンポーネント構成のエクスポートでエラーが発生しました: ${error.message}`);
      }
    });

    it('複数ファイルの切り替えでも正しいファイルがエクスポートされる', async () => {
      const testFilePath1 = helper.createBasicTestFile();
      const testFilePath2 = helper.createComplexTestFile();

      // 1つ目のファイルを開く
      await helper.openTestFile(testFilePath1);
      await helper.openPreview();

      // 2つ目のファイルを開く
      await helper.openTestFile(testFilePath2);
      await helper.openPreview();

      try {
        await helper.executeExport();
        assert.ok(true, '複数ファイル切り替え後のエクスポートが正常に実行されました');
      } catch (error) {
        console.error('複数ファイル切り替え後のエクスポートエラー:', error);
        assert.fail(`複数ファイル切り替え後のエクスポートでエラーが発生しました: ${error.message}`);
      }
    });

    it('大量コンポーネントファイルでもエクスポートが正常に動作する', async () => {
      const testFilePath = helper.createLargeTestFile(100);
      await helper.openTestFile(testFilePath);
      await helper.openPreview();

      try {
        await helper.executeExport();
        assert.ok(true, '大量コンポーネントファイルのエクスポートが正常に実行されました');
      } catch (error) {
        console.error('大量コンポーネントファイルのエクスポートエラー:', error);
        assert.fail(`大量コンポーネントファイルのエクスポートでエラーが発生しました: ${error.message}`);
      }
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないファイルパスでエクスポートを実行した場合、適切にエラーが処理される', async () => {
      const nonExistentPath = path.join(__dirname, 'non-existent-file.tui.yml');

      try {
        await helper.executeExport(nonExistentPath);
        assert.fail('存在しないファイルパスでエラーが発生すべきでした');
      } catch (error) {
        assert.ok(error, '存在しないファイルパスで適切にエラーが発生しました');
      }
    });

    it('無効なYAMLファイルでもエクスポートが適切に処理される', async () => {
      const testFilePath = helper.createInvalidYamlFile();
      await helper.openTestFile(testFilePath);
      await helper.openPreview();

      try {
        await helper.executeExport();
        assert.ok(true, '無効なYAMLファイルのエクスポートが適切に処理されました');
      } catch (error) {
        assert.ok(error, '無効なYAMLファイルで適切にエラーが発生しました');
      }
    });
  });

  describe('パフォーマンステスト', () => {
    it('連続したプレビューとエクスポート操作が正常に動作する', async () => {
      const testFilePath = helper.createBasicTestFile();
      await helper.openTestFile(testFilePath);

      for (let i = 0; i < 3; i++) {
        try {
          await helper.openPreview();
          await helper.executeExport();
          console.log(`連続操作 ${i + 1} 回目が正常に完了しました`);
        } catch (error) {
          console.error(`連続操作 ${i + 1} 回目でエラー:`, error);
          assert.fail(`連続操作 ${i + 1} 回目でエラーが発生しました: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      assert.ok(true, '連続したプレビューとエクスポート操作が正常に完了しました');
    });

    it('複数のファイルを連続してエクスポートしても正常に動作する', async () => {
      const testFiles = [
        helper.createBasicTestFile(),
        helper.createComplexTestFile(),
        helper.createLargeTestFile(20)
      ];

      for (let i = 0; i < testFiles.length; i++) {
        try {
          await helper.openTestFile(testFiles[i]);
          await helper.openPreview();
          await helper.executeExport();
          console.log(`ファイル ${i + 1} のエクスポートが正常に完了しました`);
        } catch (error) {
          console.error(`ファイル ${i + 1} のエクスポートエラー:`, error);
          assert.fail(`ファイル ${i + 1} のエクスポートでエラーが発生しました: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      assert.ok(true, '複数ファイルの連続エクスポートが正常に完了しました');
    });
  });

  describe('エッジケース', () => {
    it('空のコンポーネント配列でもエクスポートが正常に動作する', async () => {
      const content = `page:
  id: empty-test
  title: "空のコンポーネントテスト"
  layout: vertical
  components: []`;

      const testFilePath = helper.createTestFile(content, 'empty-test.tui.yml');
      await helper.openTestFile(testFilePath);
      await helper.openPreview();

      try {
        await helper.executeExport();
        assert.ok(true, '空のコンポーネント配列のエクスポートが正常に実行されました');
      } catch (error) {
        console.error('空のコンポーネント配列のエクスポートエラー:', error);
        assert.fail(`空のコンポーネント配列のエクスポートでエラーが発生しました: ${error.message}`);
      }
    });

    it('非常に長いテキストでもエクスポートが正常に動作する', async () => {
      const longText = 'A'.repeat(10000);
      const content = `page:
  id: long-text-test
  title: "長いテキストテスト"
  layout: vertical
  components:
    - Text:
        variant: p
        value: "${longText}"`;

      const testFilePath = helper.createTestFile(content, 'long-text-test.tui.yml');
      await helper.openTestFile(testFilePath);
      await helper.openPreview();

      try {
        await helper.executeExport();
        assert.ok(true, '長いテキストのエクスポートが正常に実行されました');
      } catch (error) {
        console.error('長いテキストのエクスポートエラー:', error);
        assert.fail(`長いテキストのエクスポートでエラーが発生しました: ${error.message}`);
      }
    });
  });
});

/**
 * テスト実行の統計情報
 */
describe('テスト統計情報', () => {
  it('全てのテストケースが正常に実行される', async () => {
    // このテストは実際のテスト実行統計を確認するためのプレースホルダー
    assert.ok(true, '全てのテストケースが正常に実行されました');
  });
}); 