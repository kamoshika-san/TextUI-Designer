/**
 * ThemeManagerの基本テスト
 */

const assert = require('assert');
const { describe, it, beforeEach, afterEach } = require('mocha');

// グローバルにモックを設定
global.vscode = global.vscode || {};

describe('ThemeManager', () => {
  let themeManager;
  let testThemePath;

  beforeEach(() => {
    // ファクトリからThemeManagerを作成
    global.cleanupMocks();
    
    if (!global.ThemeManagerFactory || typeof global.ThemeManagerFactory.createForTest !== 'function') {
      const path = require('path');
      const factoryPath = path.resolve(__dirname, '../mocks/theme-manager-factory.js');
      const { ThemeManagerFactory } = require(factoryPath);
      global.ThemeManagerFactory = ThemeManagerFactory;
    }
    
    themeManager = global.ThemeManagerFactory.createForTest(global.vscode, {
      extensionPath: __dirname + '/../../',
      workspacePath: __dirname + '/../../'
    });
  });

  afterEach(() => {
    // テスト用テーマファイルを削除
    if (themeManager && themeManager._testHelpers && testThemePath) {
      themeManager._testHelpers.cleanupTestFile(testThemePath);
    }
    
    if (themeManager && themeManager._testHelpers) {
      themeManager._testHelpers.resetAllMocks();
      themeManager._testHelpers.restoreRequire();
    }
    
    global.cleanupMocks();
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
    
    testThemePath = themeManager._testHelpers.createTestThemeFile(testTheme);
    
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
    
    testThemePath = themeManager._testHelpers.createTestThemeFile(customTheme);
    
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
    const fs = require('fs');
    const path = require('path');
    testThemePath = path.join(__dirname, '../../textui-theme.yml');
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

  describe('ファクトリパターンの検証', () => {
    it('mockContextが正しく設定されている', () => {
      assert.ok(themeManager._testHelpers.mockContext);
      assert.ok(typeof themeManager._testHelpers.mockContext.extensionPath === 'string');
      assert.ok(Array.isArray(themeManager._testHelpers.mockContext.subscriptions));
    });

    it('extendedVscodeが正しく設定されている', () => {
      const extendedVscode = themeManager._testHelpers.extendedVscode;
      assert.ok(extendedVscode);
      assert.ok(extendedVscode.workspace);
      assert.ok(Array.isArray(extendedVscode.workspace.workspaceFolders));
      assert.ok(typeof extendedVscode.workspace.getConfiguration === 'function');
    });

    it('ヘルパーメソッドが正しく設定されている', () => {
      assert.ok(typeof themeManager._testHelpers.createTestThemeFile === 'function');
      assert.ok(typeof themeManager._testHelpers.cleanupTestFile === 'function');
      assert.ok(typeof themeManager._testHelpers.resetAllMocks === 'function');
      assert.ok(typeof themeManager._testHelpers.restoreRequire === 'function');
    });
  });
}); 