/**
 * SettingsServiceの基本テスト（TypeScript版）
 */
import assert from 'assert';
import { describe, it, beforeEach } from 'mocha';

// VSCode APIとConfigManagerのモック
const mockConfig = {
  supportedFileExtensions: ['.tui.yml', '.tui.json'],
  autoPreview: { enabled: true },
  devTools: { enabled: false },
  webview: { theme: 'light' },
  export: { format: 'html' },
  diagnostics: { lint: true },
  schema: { strict: true },
  templates: { default: 'form' }
};

const mockConfigManager = {
  getSupportedFileExtensions: () => mockConfig.supportedFileExtensions,
  isAutoPreviewEnabled: () => mockConfig.autoPreview.enabled,
  isDevToolsEnabled: () => mockConfig.devTools.enabled,
  getWebViewSettings: () => mockConfig.webview,
  getExportSettings: () => mockConfig.export,
  getDiagnosticSettings: () => mockConfig.diagnostics,
  getSchemaSettings: () => mockConfig.schema,
  getTemplateSettings: () => mockConfig.templates,
  resetConfiguration: () => { mockConfig.autoPreview.enabled = false; },
};

let infoMessages: string[] = [];
const mockErrorHandler = {
  executeSafely: async (fn: any) => { try { await fn(); return true; } catch { return false; } },
  showInfo: (msg: string) => infoMessages.push(msg)
};

let lastCommand: any;
let lastWarning: any;
const mockVscode = {
  commands: {
    executeCommand: async (cmd: string, arg: any) => { lastCommand = { cmd, arg }; }
  },
  window: {
    showWarningMessage: async (msg: string, opts: any, btn: string) => { lastWarning = msg; return btn; },
    showTextDocument: async () => {}
  },
  workspace: {
    openTextDocument: async ({ content, language }: any) => ({ content, language }),
    onDidChangeConfiguration: (cb: any) => {
      // テスト用: コールバックを保存
      (mockVscode as any)._onDidChangeConfiguration = cb;
      return { dispose: () => {} };
    }
  },
  Disposable: class { dispose() {} }
};

// ConfigurationChangeEventのモック
function createConfigEvent(affects: string[]) {
  return {
    affectsConfiguration: (key: string) => affects.includes(key)
  };
}

// requireフックで依存を差し替え
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id: string) {
  if (id.endsWith('config-manager')) return mockConfigManager;
  if (id.endsWith('error-handler')) return mockErrorHandler;
  if (id === 'vscode') return mockVscode;
  return originalRequire.apply(this, arguments);
};

const { SettingsService } = require('../../src/services/settings-service.ts');

describe('SettingsService', () => {
  let service: any;
  beforeEach(() => {
    // 各テスト前に状態リセット
    infoMessages = [];
    lastCommand = null;
    lastWarning = null;
    service = new SettingsService();
  });

  it('設定値の取得が正しく動作する', () => {
    // getCurrentSettingsはprivateなのでshowSettings経由で確認
    const settings = service["getCurrentSettings"].call(service);
    assert.deepStrictEqual(settings.supportedFileExtensions, ['.tui.yml', '.tui.json']);
    assert.strictEqual(settings.autoPreview.enabled, true);
    assert.strictEqual(settings.devTools.enabled, false);
    assert.strictEqual(settings.webview.theme, 'light');
    assert.strictEqual(settings.export.format, 'html');
    assert.strictEqual(settings.diagnostics.lint, true);
    assert.strictEqual(settings.schema.strict, true);
    assert.strictEqual(settings.templates.default, 'form');
  });

  it('設定値の更新（リセット）が正しく動作する', async () => {
    mockConfig.autoPreview.enabled = true;
    await service.resetSettings();
    assert.strictEqual(mockConfig.autoPreview.enabled, false);
    assert.ok(infoMessages.includes('設定をリセットしました。'));
  });

  it('設定変更イベントが正しく発火する', () => {
    let called = false;
    const disposable = service.startWatching(() => { called = true; });
    // textui-designer設定が変更された場合
    (mockVscode as any)._onDidChangeConfiguration(createConfigEvent(['textui-designer']));
    assert.ok(called);
    disposable.dispose();
  });

  it('設定の検証が正しく行われる', () => {
    // textui-designer設定が変更された場合
    const event = createConfigEvent(['textui-designer']);
    assert.strictEqual(service.hasConfigurationChanged(event), true);
    // 他の設定の場合
    const event2 = createConfigEvent(['other-extension']);
    assert.strictEqual(service.hasConfigurationChanged(event2), false);
  });
}); 