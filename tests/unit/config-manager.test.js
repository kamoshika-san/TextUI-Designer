/**
 * ConfigManagerの基本テスト
 */

const assert = require('assert');
const { describe, it, beforeEach } = require('mocha');

// VSCode APIのモック
const mockConfigValues = {
  'supportedFileExtensions': ['.tui.yml', '.tui.yaml'],
  'autoPreview.enabled': true,
  'devTools.enabled': false,
  'webview.disableThemeVariables': false,
  'custom.key': 'customValue'
};

const mockVscode = {
  workspace: {
    getConfiguration: (section) => ({
      get: (key, defaultValue) => {
        if (section === 'textui-designer') {
          return Object.prototype.hasOwnProperty.call(mockConfigValues, key)
            ? mockConfigValues[key]
            : defaultValue;
        }
        return defaultValue;
      },
      update: () => Promise.resolve()
    })
  },
  ConfigurationTarget: {
    Global: 1
  }
};

global.vscode = mockVscode;

const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'vscode') {
    return mockVscode;
  }
  return originalRequire.apply(this, arguments);
};

const ConfigManager = require('../../dist/utils/config-manager.js').ConfigManager;

describe('ConfigManager', () => {
  beforeEach(() => {
    // 必要ならmockConfigValuesをリセット
    mockConfigValues['supportedFileExtensions'] = ['.tui.yml', '.tui.yaml'];
    mockConfigValues['autoPreview.enabled'] = true;
    mockConfigValues['devTools.enabled'] = false;
    mockConfigValues['webview.disableThemeVariables'] = false;
    mockConfigValues['custom.key'] = 'customValue';
  });

  it('既定値が正しく返る', () => {
    // モック値を消して既定値を返すか確認
    delete mockConfigValues['supportedFileExtensions'];
    const result = ConfigManager.getSupportedFileExtensions();
    assert.deepStrictEqual(result, ['.tui.yml', '.tui.yaml']);
  });

  it('任意のキーで値が取得できる', () => {
    const value = ConfigManager.get('custom.key', 'default');
    assert.strictEqual(value, 'customValue');
  });

  it('存在しないキーでデフォルト値が返る', () => {
    const value = ConfigManager.get('not.exist.key', 'defaultValue');
    assert.strictEqual(value, 'defaultValue');
  });

  it('型安全な値取得ができる', () => {
    // boolean型の既定値
    delete mockConfigValues['autoPreview.enabled'];
    const value = ConfigManager.isAutoPreviewEnabled();
    assert.strictEqual(value, false); // デフォルトはfalse
  });
}); 