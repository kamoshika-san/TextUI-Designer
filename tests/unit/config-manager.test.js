/**
 * ConfigManagerの基本テスト
 */

const assert = require('assert');
const path = require('path');
const { describe, it, beforeEach, afterEach } = require('mocha');

describe('ConfigManager', function() {
  let ConfigManager;

  beforeEach(function() {
    // モックをクリーンアップ（ファクトリをグローバルに再設定）
    global.cleanupMocks();
    
    if (!global.ConfigManagerFactory || typeof global.ConfigManagerFactory.createForTest !== 'function') {
      throw new Error('Global ConfigManagerFactory or createForTest method is not available');
    }
    
    // テスト用のConfigManagerを作成
    ConfigManager = global.ConfigManagerFactory.createForTest(global.vscode, {
      'supportedFileExtensions': ['.tui.yml', '.tui.yaml'],
      'autoPreview.enabled': true,
      'devTools.enabled': false,
      'webview.disableThemeVariables': false,
      'custom.key': 'customValue'
    });
  });

  afterEach(function() {
    // テスト後のクリーンアップ
    global.cleanupMocks();
  });

  describe('getSupportedFileExtensions', function() {
    it('サポートされているファイル拡張子を正しく返すこと', function() {
      const extensions = ConfigManager.getSupportedFileExtensions();
      assert.deepStrictEqual(extensions, ['.tui.yml', '.tui.yaml']);
    });
  });

  describe('get', function() {
    it('設定値を正しく取得できること', function() {
      const value = ConfigManager.get('autoPreview.enabled', false);
      assert.strictEqual(value, true);
    });

    it('存在しない設定値の場合デフォルト値を返すこと', function() {
      const value = ConfigManager.get('nonexistent.key', 'default');
      assert.strictEqual(value, 'default');
    });

    it('カスタム設定値を正しく取得できること', function() {
      const value = ConfigManager.get('custom.key', 'default');
      assert.strictEqual(value, 'customValue');
    });
  });

  describe('isAutoPreviewEnabled', function() {
    it('オートプレビューが有効な場合trueを返すこと', function() {
      const enabled = ConfigManager.isAutoPreviewEnabled();
      assert.strictEqual(enabled, true);
    });
  });

  describe('isDevToolsEnabled', function() {
    it('開発ツールが無効な場合falseを返すこと', function() {
      const enabled = ConfigManager.isDevToolsEnabled();
      assert.strictEqual(enabled, false);
    });
  });

  describe('isWebviewThemeVariablesDisabled', function() {
    it('WebViewテーマ変数が有効な場合falseを返すこと', function() {
      const disabled = ConfigManager.isWebviewThemeVariablesDisabled();
      assert.strictEqual(disabled, false);
    });
  });

  describe('update', function() {
    it('設定値を正しく更新できること', async function() {
      await ConfigManager.update('devTools.enabled', true);
      const value = ConfigManager.get('devTools.enabled', false);
      assert.strictEqual(value, true);
    });

    it('新しい設定値を追加できること', async function() {
      await ConfigManager.update('new.setting', 'newValue');
      const value = ConfigManager.get('new.setting', 'default');
      assert.strictEqual(value, 'newValue');
    });
  });

  describe('複合的なテスト', function() {
    it('設定を更新後、関連メソッドが正しい値を返すこと', async function() {
      // 開発ツールを有効にする
      await ConfigManager.update('devTools.enabled', true);
      assert.strictEqual(ConfigManager.isDevToolsEnabled(), true);

      // オートプレビューを無効にする
      await ConfigManager.update('autoPreview.enabled', false);
      assert.strictEqual(ConfigManager.isAutoPreviewEnabled(), false);

      // WebViewテーマ変数を無効にする
      await ConfigManager.update('webview.disableThemeVariables', true);
      assert.strictEqual(ConfigManager.isWebviewThemeVariablesDisabled(), true);
    });
  });
}); 