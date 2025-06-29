/**
 * テスト専用ConfigManagerファクトリ
 * 依存性注入パターンでVSCode APIをモック化
 */

class TestConfigManager {
  constructor(mockVscode, initialConfig = {}) {
    this.vscode = mockVscode;
    this.config = {
      'supportedFileExtensions': ['.tui.yml', '.tui.yaml'],
      'autoPreview.enabled': true,
      'devTools.enabled': false,
      'webview.disableThemeVariables': false,
      ...initialConfig
    };
  }

  /**
   * サポートされているファイル拡張子を取得
   */
  static getSupportedFileExtensions() {
    return ['.tui.yml', '.tui.yaml'];
  }

  /**
   * 設定値を取得
   */
  static get(key, defaultValue) {
    const instance = TestConfigManager._getInstance();
    return instance.config[key] !== undefined ? instance.config[key] : defaultValue;
  }

  /**
   * オートプレビューが有効かどうか
   */
  static isAutoPreviewEnabled() {
    const instance = TestConfigManager._getInstance();
    return instance.config['autoPreview.enabled'] || false;
  }

  /**
   * 開発ツールが有効かどうか
   */
  static isDevToolsEnabled() {
    const instance = TestConfigManager._getInstance();
    return instance.config['devTools.enabled'] || false;
  }

  /**
   * WebViewテーマ変数が無効かどうか
   */
  static isWebviewThemeVariablesDisabled() {
    const instance = TestConfigManager._getInstance();
    return instance.config['webview.disableThemeVariables'] || false;
  }

  /**
   * 設定値を更新
   */
  static update(key, value, target) {
    const instance = TestConfigManager._getInstance();
    instance.config[key] = value;
    return Promise.resolve();
  }

  /**
   * 設定値をリセット
   */
  static reset() {
    TestConfigManager._instance = null;
  }

  /**
   * シングルトンインスタンスを取得
   */
  static _getInstance() {
    if (!TestConfigManager._instance) {
      const mockVscode = require('./vscode-mock');
      TestConfigManager._instance = new TestConfigManager(mockVscode);
    }
    return TestConfigManager._instance;
  }

  /**
   * テスト用にインスタンスを設定
   */
  static _setInstance(instance) {
    TestConfigManager._instance = instance;
  }
}

// シングルトンインスタンス
TestConfigManager._instance = null;

/**
 * ConfigManagerファクトリ
 */
class ConfigManagerFactory {
  /**
   * テスト用ConfigManagerを作成
   */
  static createForTest(mockVscode, initialConfig = {}) {
    const instance = new TestConfigManager(mockVscode, initialConfig);
    TestConfigManager._setInstance(instance);
    return TestConfigManager;
  }

  /**
   * 本番用ConfigManagerを取得
   */
  static createForProduction() {
    // 本番環境では実際のConfigManagerを返す
    try {
      return require('../../out/utils/config-manager.js').ConfigManager;
    } catch (error) {
      // フォールバック
      return TestConfigManager;
    }
  }

  /**
   * 環境に応じたConfigManagerを取得
   */
  static create() {
    if (process.env.NODE_ENV === 'test') {
      const mockVscode = require('./vscode-mock');
      return ConfigManagerFactory.createForTest(mockVscode);
    } else {
      return ConfigManagerFactory.createForProduction();
    }
  }
}

module.exports = {
  TestConfigManager,
  ConfigManagerFactory
}; 