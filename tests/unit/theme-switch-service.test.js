const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { ThemeSwitchService } = require('../../out/services/webview/theme-switch-service');

describe('ThemeSwitchService', () => {
  let service;

  beforeEach(() => {
    service = new ThemeSwitchService();
  });

  it('空のthemePathではデフォルトテーマへ切り替える', async () => {
    let appliedThemePath = 'initial';
    const themeManager = {
      setThemePath: (nextPath) => {
        appliedThemePath = nextPath;
      },
      loadTheme: async () => {},
      generateCSSVariables: () => '--test: value;'
    };

    const result = await service.switchTheme({
      themeManager,
      themePath: '',
      workspaceFolders: []
    });

    assert.strictEqual(appliedThemePath, undefined);
    assert.strictEqual(result.cssVariables, '');
    assert.deepStrictEqual(result.notice, {
      kind: 'info',
      message: 'Switched to the default theme.'
    });
  });

  it('テーマファイルが存在しない場合はerror通知を返す', async () => {
    const themeManager = {
      setThemePath: () => {},
      loadTheme: async () => {
        throw new Error('should not be called');
      },
      generateCSSVariables: () => '--existing: css;'
    };

    const result = await service.switchTheme({
      themeManager,
      themePath: 'missing-theme.yml',
      workspaceFolders: [{ uri: { fsPath: '/tmp/not-found' } }]
    });

    assert.strictEqual(result.cssVariables, '--existing: css;');
    assert.deepStrictEqual(result.notice, {
      kind: 'error',
      message: 'Theme file not found: missing-theme.yml'
    });
  });

  it('存在するテーマファイルでは読み込み・CSS生成を実行する', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-theme-switch-'));
    const themeFile = path.join(tempDir, 'nested', 'custom-theme.yml');
    fs.mkdirSync(path.dirname(themeFile), { recursive: true });
    fs.writeFileSync(themeFile, 'theme:\n  name: custom\n');

    let appliedThemePath;
    let loadThemeCalled = false;

    const themeManager = {
      setThemePath: (nextPath) => {
        appliedThemePath = nextPath;
      },
      loadTheme: async () => {
        loadThemeCalled = true;
      },
      generateCSSVariables: () => '--generated: css;'
    };

    try {
      const result = await service.switchTheme({
        themeManager,
        themePath: 'nested/custom-theme.yml',
        workspaceFolders: [{ uri: { fsPath: tempDir } }]
      });

      assert.strictEqual(appliedThemePath, themeFile);
      assert.strictEqual(loadThemeCalled, true);
      assert.strictEqual(result.cssVariables, '--generated: css;');
      assert.deepStrictEqual(result.notice, {
        kind: 'info',
        message: 'Theme switched: custom-theme.yml'
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
