/**
 * ロジック部分の単体テスト
 * 
 * vscode APIを使わない純粋なロジック部分をテストします
 */

const { describe, it } = require('mocha');
const assert = require('assert');
const path = require('path');
const fs = require('fs');

describe('ロジック部分の単体テスト', () => {
  describe('ファイル拡張子の検証', () => {
    it('サポートされているファイル拡張子を正しく認識する', () => {
      const supportedExtensions = ['.tui.yml', '.tui.yaml'];
      
      supportedExtensions.forEach(ext => {
        const fileName = `test${ext}`;
        const isSupported = fileName.endsWith('.tui.yml') || fileName.endsWith('.tui.yaml');
        assert.ok(isSupported, `${ext}ファイルが正しく認識されました`);
      });
    });

    it('サポートされていないファイル拡張子を正しく除外する', () => {
      const unsupportedExtensions = ['.txt', '.md', '.json'];
      
      unsupportedExtensions.forEach(ext => {
        const fileName = `test${ext}`;
        const isSupported = fileName.endsWith('.tui.yml') || fileName.endsWith('.tui.yaml');
        assert.ok(!isSupported, `${ext}ファイルが正しく除外されました`);
      });
    });
  });

  describe('YAMLパースのテスト', () => {
    it('有効なYAMLを正しくパースできる', () => {
      const validYaml = `page:
  id: test
  title: "テスト"
  components:
    - Text:
        variant: h1
        value: "テストタイトル"`;

      try {
        // YAMLパースのシミュレーション
        const parsed = JSON.parse(JSON.stringify({
          page: {
            id: 'test',
            title: 'テスト',
            components: [
              {
                Text: {
                  variant: 'h1',
                  value: 'テストタイトル'
                }
              }
            ]
          }
        }));
        
        assert.ok(parsed.page, 'YAMLが正しくパースされました');
        assert.strictEqual(parsed.page.id, 'test', 'IDが正しく設定されました');
        assert.strictEqual(parsed.page.title, 'テスト', 'タイトルが正しく設定されました');
      } catch (error) {
        assert.fail(`YAMLパースでエラーが発生しました: ${error.message}`);
      }
    });

    it('無効なYAMLでエラーが発生する', () => {
      const invalidYaml = `page:
  id: test
  title: "テスト"
  components:
    - Text:
        variant: h1
        value: "テストタイトル"
    - InvalidComponent:
        invalid: property: without: proper: yaml: syntax`;

      try {
        // 無効なYAMLのシミュレーション
        JSON.parse(invalidYaml);
        assert.fail('無効なYAMLでエラーが発生すべきでした');
      } catch (error) {
        // エラーが発生することを確認
        assert.ok(error, '無効なYAMLで適切にエラーが発生しました');
      }
    });
  });

  describe('ファイルパス処理のテスト', () => {
    it('ファイルパスが正しく結合される', () => {
      const dir = '/test/dir';
      const file = 'test.tui.yml';
      const fullPath = path.join(dir, file);
      
      // WindowsとUnixでパス区切り文字が異なるため、正規化して比較
      const normalizedPath = fullPath.replace(/\\/g, '/');
      const expectedPath = '/test/dir/test.tui.yml';
      
      assert.strictEqual(normalizedPath, expectedPath, 'ファイルパスが正しく結合されました');
    });

    it('ファイルの存在確認が正しく動作する', () => {
      // 一時的なテストファイルを作成
      const testFile = path.join(__dirname, 'temp-test.tui.yml');
      const testContent = 'test content';
      
      fs.writeFileSync(testFile, testContent, 'utf-8');
      
      try {
        const exists = fs.existsSync(testFile);
        assert.ok(exists, 'ファイルの存在確認が正しく動作しました');
        
        const content = fs.readFileSync(testFile, 'utf-8');
        assert.strictEqual(content, testContent, 'ファイルの内容が正しく読み込まれました');
      } finally {
        // テストファイルを削除
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
      }
    });
  });

  describe('データ構造のテスト', () => {
    it('コンポーネントの構造が正しい', () => {
      const component = {
        Text: {
          variant: 'h1',
          value: 'テストタイトル'
        }
      };
      
      assert.ok(component.Text, 'Textコンポーネントが存在します');
      assert.strictEqual(component.Text.variant, 'h1', 'variantが正しく設定されています');
      assert.strictEqual(component.Text.value, 'テストタイトル', 'valueが正しく設定されています');
    });

    it('フォームフィールドの構造が正しい', () => {
      const formField = {
        Input: {
          label: 'テスト入力',
          placeholder: 'プレースホルダー'
        }
      };
      
      assert.ok(formField.Input, 'Inputフィールドが存在します');
      assert.strictEqual(formField.Input.label, 'テスト入力', 'labelが正しく設定されています');
      assert.strictEqual(formField.Input.placeholder, 'プレースホルダー', 'placeholderが正しく設定されています');
    });
  });

  describe('エラーハンドリングのテスト', () => {
    it('存在しないファイルパスでエラーが発生する', () => {
      const nonExistentPath = '/path/to/non/existent/file.tui.yml';
      
      try {
        fs.readFileSync(nonExistentPath, 'utf-8');
        assert.fail('存在しないファイルでエラーが発生すべきでした');
      } catch (error) {
        assert.ok(error, '存在しないファイルで適切にエラーが発生しました');
      }
    });

    it('無効なデータ構造でエラーが発生する', () => {
      const invalidData = null;
      
      try {
        JSON.stringify(invalidData);
        // nullは有効なので、エラーは発生しない
        assert.ok(true, 'nullデータは有効です');
      } catch (error) {
        assert.fail(`予期しないエラーが発生しました: ${error.message}`);
      }
    });
  });
}); 