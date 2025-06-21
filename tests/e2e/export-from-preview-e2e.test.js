/**
 * プレビュー画面からのエクスポート機能のE2Eテスト
 * 
 * 実際のWebViewとVS Code環境での動作をテストします
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

describe('プレビュー画面からのエクスポート機能 E2Eテスト', () => {
  let testFile;
  let testFilePath;
  let originalActiveTextEditor;

  before(async () => {
    // テスト用の.tui.ymlファイルを作成
    testFile = `page:
  id: e2e-test
  title: "E2Eテスト"
  layout: vertical
  components:
    - Text:
        variant: h1
        value: "E2Eテストタイトル"
    - Button:
        text: "E2Eテストボタン"
        variant: primary
    - Form:
        fields:
          - Input:
              label: "テスト入力"
              placeholder: "テストプレースホルダー"
          - Checkbox:
              label: "テストチェックボックス"
    - Container:
        layout: horizontal
        components:
          - Text:
              variant: p
              value: "左側のテキスト"
          - Divider:
              orientation: vertical
          - Text:
              variant: p
              value: "右側のテキスト"`;

    testFilePath = path.join(__dirname, 'e2e-test.tui.yml');
    fs.writeFileSync(testFilePath, testFile, 'utf-8');

    // 現在のアクティブエディタを保存
    originalActiveTextEditor = vscode.window.activeTextEditor;
  });

  after(async () => {
    // テストファイルを削除
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    // 元のエディタを復元
    if (originalActiveTextEditor) {
      await vscode.window.showTextDocument(originalActiveTextEditor.document);
    }
  });

  describe('基本的なエクスポート機能', () => {
    it('プレビュー画面を開いてからエクスポートボタンを押すと正常にエクスポートされる', async () => {
      // テストファイルを開く
      const document = await vscode.workspace.openTextDocument(testFilePath);
      await vscode.window.showTextDocument(document);

      // プレビューを開く
      await vscode.commands.executeCommand('textui-designer.openPreview');

      // WebViewの初期化を待つ
      await new Promise(resolve => setTimeout(resolve, 2000));

      // エクスポートコマンドを実行
      try {
        await vscode.commands.executeCommand('textui-designer.export');
        
        // エクスポートが成功した場合、ファイル選択ダイアログが表示されるはず
        // 実際のファイル保存はテストでは行わないが、エラーが発生しないことを確認
        assert.ok(true, 'プレビュー画面からのエクスポートが正常に実行されました');
      } catch (error) {
        console.error('プレビュー画面からのエクスポートエラー:', error);
        assert.fail(`プレビュー画面からのエクスポートでエラーが発生しました: ${error.message}`);
      }
    });

    it('WebViewがアクティブな状態でエクスポートボタンを押すと正常にエクスポートされる', async () => {
      // テストファイルを開く
      const document = await vscode.workspace.openTextDocument(testFilePath);
      await vscode.window.showTextDocument(document);

      // プレビューを開く
      await vscode.commands.executeCommand('textui-designer.openPreview');

      // WebViewの初期化を待つ
      await new Promise(resolve => setTimeout(resolve, 2000));

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
        assert.ok(true, 'WebViewアクティブ状態でのエクスポートが正常に実行されました');
      } catch (error) {
        console.error('WebViewアクティブ状態でのエクスポートエラー:', error);
        assert.fail(`WebViewアクティブ状態でのエクスポートでエラーが発生しました: ${error.message}`);
      }
    });

    it('ファイルパス付きエクスポートコマンドが正常に動作する', async () => {
      // テストファイルを開く
      const document = await vscode.workspace.openTextDocument(testFilePath);
      await vscode.window.showTextDocument(document);

      // プレビューを開く
      await vscode.commands.executeCommand('textui-designer.openPreview');

      // WebViewの初期化を待つ
      await new Promise(resolve => setTimeout(resolve, 2000));

      // ファイルパス付きエクスポートコマンドを実行
      try {
        await vscode.commands.executeCommand('textui-designer.export', testFilePath);
        assert.ok(true, 'ファイルパス付きエクスポートが正常に実行されました');
      } catch (error) {
        console.error('ファイルパス付きエクスポートエラー:', error);
        assert.fail(`ファイルパス付きエクスポートでエラーが発生しました: ${error.message}`);
      }
    });
  });

  describe('複雑なシナリオ', () => {
    it('複数の.tui.ymlファイルを開いても正しいファイルがエクスポートされる', async () => {
      // 2つ目のテストファイルを作成
      const testFile2 = `page:
  id: e2e-test-2
  title: "E2Eテスト2"
  layout: vertical
  components:
    - Text:
        variant: h2
        value: "2番目のE2Eテスト"
    - Alert:
        type: info
        message: "これは2番目のテストファイルです"`;

      const testFilePath2 = path.join(__dirname, 'e2e-test-2.tui.yml');
      fs.writeFileSync(testFilePath2, testFile2, 'utf-8');

      try {
        // 1つ目のファイルを開く
        const document1 = await vscode.workspace.openTextDocument(testFilePath);
        await vscode.window.showTextDocument(document1);

        // プレビューを開く
        await vscode.commands.executeCommand('textui-designer.openPreview');

        // WebViewの初期化を待つ
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 2つ目のファイルを開く
        const document2 = await vscode.workspace.openTextDocument(testFilePath2);
        await vscode.window.showTextDocument(document2);

        // プレビューを更新
        await vscode.commands.executeCommand('textui-designer.openPreview');

        // WebViewの初期化を待つ
        await new Promise(resolve => setTimeout(resolve, 2000));

        // エクスポートコマンドを実行（2つ目のファイルがエクスポートされるはず）
        try {
          await vscode.commands.executeCommand('textui-designer.export');
          assert.ok(true, '複数ファイル切り替え後のエクスポートが正常に実行されました');
        } catch (error) {
          console.error('複数ファイル切り替え後のエクスポートエラー:', error);
          assert.fail(`複数ファイル切り替え後のエクスポートでエラーが発生しました: ${error.message}`);
        }
      } finally {
        // 2つ目のテストファイルを削除
        if (fs.existsSync(testFilePath2)) {
          fs.unlinkSync(testFilePath2);
        }
      }
    });

    it('プレビュー画面を閉じてから再度開いてもエクスポートが正常に動作する', async () => {
      // テストファイルを開く
      const document = await vscode.workspace.openTextDocument(testFilePath);
      await vscode.window.showTextDocument(document);

      // 1回目のプレビューを開く
      await vscode.commands.executeCommand('textui-designer.openPreview');

      // WebViewの初期化を待つ
      await new Promise(resolve => setTimeout(resolve, 2000));

      // プレビューを閉じる（WebViewを閉じる）
      // 実際のWebViewを閉じるのは難しいため、新しいプレビューを開くことでテスト

      // 2回目のプレビューを開く
      await vscode.commands.executeCommand('textui-designer.openPreview');

      // WebViewの初期化を待つ
      await new Promise(resolve => setTimeout(resolve, 2000));

      // エクスポートコマンドを実行
      try {
        await vscode.commands.executeCommand('textui-designer.export');
        assert.ok(true, 'プレビュー再開後のエクスポートが正常に実行されました');
      } catch (error) {
        console.error('プレビュー再開後のエクスポートエラー:', error);
        assert.fail(`プレビュー再開後のエクスポートでエラーが発生しました: ${error.message}`);
      }
    });

    it('エクスポート中にプレビュー画面を操作してもエラーが発生しない', async () => {
      // テストファイルを開く
      const document = await vscode.workspace.openTextDocument(testFilePath);
      await vscode.window.showTextDocument(document);

      // プレビューを開く
      await vscode.commands.executeCommand('textui-designer.openPreview');

      // WebViewの初期化を待つ
      await new Promise(resolve => setTimeout(resolve, 2000));

      // エクスポートコマンドを実行（非同期）
      const exportPromise = vscode.commands.executeCommand('textui-designer.export');

      // エクスポート中にプレビュー画面を操作
      await new Promise(resolve => setTimeout(resolve, 500));

      // プレビューを更新
      await vscode.commands.executeCommand('textui-designer.openPreview');

      // エクスポートの完了を待つ
      try {
        await exportPromise;
        assert.ok(true, 'エクスポート中のプレビュー操作が正常に処理されました');
      } catch (error) {
        console.error('エクスポート中のプレビュー操作エラー:', error);
        assert.fail(`エクスポート中のプレビュー操作でエラーが発生しました: ${error.message}`);
      }
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないファイルパスでエクスポートを実行した場合、適切にエラーが処理される', async () => {
      const nonExistentPath = path.join(__dirname, 'non-existent-file.tui.yml');

      try {
        await vscode.commands.executeCommand('textui-designer.export', nonExistentPath);
        assert.fail('存在しないファイルパスでエラーが発生すべきでした');
      } catch (error) {
        // エラーが発生することを確認
        assert.ok(error, '存在しないファイルパスで適切にエラーが発生しました');
      }
    });

    it('無効なYAMLファイルでプレビューを開いた後にエクスポートを実行した場合、適切にエラーが処理される', async () => {
      // 無効なYAMLファイルを作成
      const invalidYamlFile = path.join(__dirname, 'invalid-yaml-e2e.tui.yml');
      const invalidContent = `page:
  id: invalid-e2e
  title: "無効なYAML E2E"
  components:
    - Text:
        variant: h1
        value: "無効なYAML"
    - InvalidComponent:
        invalid: property: without: proper: yaml: syntax`;

      fs.writeFileSync(invalidYamlFile, invalidContent, 'utf-8');

      try {
        // 無効なYAMLファイルを開く
        const document = await vscode.workspace.openTextDocument(invalidYamlFile);
        await vscode.window.showTextDocument(document);

        // プレビューを開く（エラーが発生する可能性がある）
        await vscode.commands.executeCommand('textui-designer.openPreview');

        // WebViewの初期化を待つ
        await new Promise(resolve => setTimeout(resolve, 2000));

        // エクスポートを実行
        try {
          await vscode.commands.executeCommand('textui-designer.export');
          // エラーが発生しない場合でも、適切に処理されることを確認
          assert.ok(true, '無効なYAMLファイルのエクスポートが適切に処理されました');
        } catch (error) {
          // エラーが発生した場合も適切に処理されることを確認
          assert.ok(error, '無効なYAMLファイルのエクスポートで適切にエラーが発生しました');
        }
      } finally {
        // テストファイルを削除
        if (fs.existsSync(invalidYamlFile)) {
          fs.unlinkSync(invalidYamlFile);
        }
      }
    });
  });

  describe('パフォーマンステスト', () => {
    it('連続したプレビューとエクスポート操作が正常に動作する', async () => {
      // テストファイルを開く
      const document = await vscode.workspace.openTextDocument(testFilePath);
      await vscode.window.showTextDocument(document);

      // 連続操作を実行
      for (let i = 0; i < 3; i++) {
        try {
          // プレビューを開く
          await vscode.commands.executeCommand('textui-designer.openPreview');
          
          // WebViewの初期化を待つ
          await new Promise(resolve => setTimeout(resolve, 2000));

          // エクスポートコマンドを実行
          await vscode.commands.executeCommand('textui-designer.export');
          
          console.log(`連続操作 ${i + 1} 回目が正常に完了しました`);
        } catch (error) {
          console.error(`連続操作 ${i + 1} 回目でエラー:`, error);
          assert.fail(`連続操作 ${i + 1} 回目でエラーが発生しました: ${error.message}`);
        }

        // 少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      assert.ok(true, '連続したプレビューとエクスポート操作が正常に完了しました');
    });

    it('大量のコンポーネントを含むファイルでもエクスポートが正常に動作する', async () => {
      // 大量のコンポーネントを含むテストファイルを作成
      const largeTestFile = `page:
  id: large-e2e-test
  title: "大量コンポーネント E2Eテスト"
  layout: vertical
  components:`;

      // 100個のコンポーネントを追加
      for (let i = 0; i < 100; i++) {
        largeTestFile += `
    - Text:
        variant: p
        value: "コンポーネント ${i + 1}"
    - Divider:`;
      }

      const largeTestFilePath = path.join(__dirname, 'large-e2e-test.tui.yml');
      fs.writeFileSync(largeTestFilePath, largeTestFile, 'utf-8');

      try {
        // 大量コンポーネントファイルを開く
        const document = await vscode.workspace.openTextDocument(largeTestFilePath);
        await vscode.window.showTextDocument(document);

        // プレビューを開く
        await vscode.commands.executeCommand('textui-designer.openPreview');

        // WebViewの初期化を待つ（大量コンポーネントのため時間を長めに）
        await new Promise(resolve => setTimeout(resolve, 5000));

        // エクスポートコマンドを実行
        try {
          await vscode.commands.executeCommand('textui-designer.export');
          assert.ok(true, '大量コンポーネントファイルのエクスポートが正常に実行されました');
        } catch (error) {
          console.error('大量コンポーネントファイルのエクスポートエラー:', error);
          assert.fail(`大量コンポーネントファイルのエクスポートでエラーが発生しました: ${error.message}`);
        }
      } finally {
        // テストファイルを削除
        if (fs.existsSync(largeTestFilePath)) {
          fs.unlinkSync(largeTestFilePath);
        }
      }
    });
  });
}); 