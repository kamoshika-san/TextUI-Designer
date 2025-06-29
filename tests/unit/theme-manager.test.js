/**
 * ThemeManagerの基本テスト
 */

const assert = require('assert');
const { describe, it, beforeEach, afterEach } = require('mocha');
const fs = require('fs');
const path = require('path');

// VSCode APIのモック
const mockVscode = {
  ExtensionContext: class {
    constructor() {
      this.subscriptions = [];
      this.extensionPath = __dirname + '/../../';
    }
  },
  workspace: {
    workspaceFolders: [{
      uri: {
        fsPath: __dirname + '/../../'
      }
    }]
  },
  FileSystemWatcher: class {
    constructor() {
      this.onDidChange = () => {};
      this.onDidCreate = () => {};
      this.onDidDelete = () => {};
    }
    dispose() {}
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

const ThemeManager = require('../../out/services/theme-manager.js').ThemeManager;

describe('ThemeManager', () => {
  let themeManager;
  let testThemePath;

  beforeEach(() => {
    const context = new mockVscode.ExtensionContext();
    themeManager = new ThemeManager(context);
    testThemePath = path.join(__dirname, '../../textui-theme.yml');
  });

  afterEach(() => {
    // テスト用テーマファイルを削除
    if (fs.existsSync(testThemePath)) {
      fs.unlinkSync(testThemePath);
    }
  });

  it('デフォルトテーマが正しく設定される', async () => {
    await themeManager.loadTheme();
    
    // デフォルトテーマが読み込まれている
    const cssVariables = themeManager.generateCSSVariables();
    
    // デフォルトカラーが含まれている（複数形）
    assert.ok(cssVariables.includes('--colors-primary'));
    assert.ok(cssVariables.includes('--colors-secondary'));
    assert.ok(cssVariables.includes('--colors-success'));
    
    // デフォルトスペーシングが含まれている
    assert.ok(cssVariables.includes('--spacing-xs'));
    assert.ok(cssVariables.includes('--spacing-md'));
    assert.ok(cssVariables.includes('--spacing-lg'));
    
    // デフォルトタイポグラフィが含まれている
    assert.ok(cssVariables.includes('--typography-fontSize-base'));
    assert.ok(cssVariables.includes('--typography-fontSize-lg'));
  });

  it('テーマファイルの読み込みが正しく動作する', async () => {
    // テスト用テーマファイルを作成
    const testTheme = {
      theme: {
        tokens: {
          colors: {
            primary: { value: '#FF0000' },
            secondary: { value: '#00FF00' }
          },
          spacing: {
            md: { value: '2rem' }
          }
        }
      }
    };
    
    fs.writeFileSync(testThemePath, JSON.stringify(testTheme, null, 2));
    
    await themeManager.loadTheme();
    const cssVariables = themeManager.generateCSSVariables();
    
    // カスタムテーマが適用されている（複数形）
    assert.ok(cssVariables.includes('--colors-primary: #FF0000'));
    assert.ok(cssVariables.includes('--colors-secondary: #00FF00'));
    assert.ok(cssVariables.includes('--spacing-md: 2rem'));
  });

  it('テーマ設定が正しく適用される', async () => {
    // カスタムテーマファイルを作成
    const customTheme = {
      theme: {
        tokens: {
          colors: {
            primary: { value: '#1E40AF' },
            surface: { value: '#374151' }
          }
        },
        components: {
          button: {
            primary: {
              backgroundColor: 'var(--color-primary)',
              borderRadius: 'var(--border-radius-lg)'
            }
          }
        }
      }
    };
    
    fs.writeFileSync(testThemePath, JSON.stringify(customTheme, null, 2));
    
    await themeManager.loadTheme();
    const cssVariables = themeManager.generateCSSVariables();
    
    // カスタムカラーが適用されている（複数形）
    assert.ok(cssVariables.includes('--colors-primary: #1E40AF'));
    assert.ok(cssVariables.includes('--colors-surface: #374151'));
    
    // コンポーネント変数が生成されている
    assert.ok(cssVariables.includes('--component-button-primary-backgroundColor'));
  });

  it('無効なテーマファイルでデフォルトテーマが使用される', async () => {
    // 無効なテーマファイルを作成
    fs.writeFileSync(testThemePath, 'invalid yaml content');
    
    await themeManager.loadTheme();
    const cssVariables = themeManager.generateCSSVariables();
    
    // デフォルトテーマが使用されている
    assert.ok(cssVariables.includes('--colors-primary'));
    assert.ok(cssVariables.includes('--spacing-md'));
  });

  it('テーマファイルが存在しない場合にデフォルトテーマが使用される', async () => {
    // テーマファイルが存在しない状態
    await themeManager.loadTheme();
    const cssVariables = themeManager.generateCSSVariables();
    
    // デフォルトテーマが使用されている
    assert.ok(cssVariables.includes('--colors-primary'));
    assert.ok(cssVariables.includes('--spacing-md'));
  });
}); 