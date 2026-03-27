const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { ThemeManagerFactory } = require('../mocks/theme-manager-factory.js');
const { buildThemeVariables } = require('../../out/exporters/theme-definition-resolver.js');
const { buildThemeStyleBlock } = require('../../out/exporters/theme-style-builder.js');

function parseCssVariableMap(css) {
  const result = {};
  const pattern = /--([A-Za-z0-9_-]+):\s*([^;]+?)\s*!important;/g;
  let match = pattern.exec(css);
  while (match) {
    result[match[1]] = match[2].trim();
    match = pattern.exec(css);
  }
  return result;
}

describe('React SSoT theme vars contract (T-20260327-054)', () => {
  let tempDir;
  let themeManager;

  beforeEach(() => {
    global.cleanupMocks();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-react-theme-vars-'));
    themeManager = ThemeManagerFactory.createForTest(global.vscode, {
      extensionPath: path.resolve(__dirname, '../..'),
      workspacePath: tempDir
    });
  });

  afterEach(() => {
    if (themeManager && themeManager._testHelpers) {
      themeManager._testHelpers.resetAllMocks();
      themeManager._testHelpers.restoreRequire();
    }
    global.cleanupMocks();
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('preview ThemeManager CSS variables and export theme variables stay aligned for a merged theme', async () => {
    const parentThemePath = path.join(tempDir, 'parent-theme.yml');
    const childThemePath = path.join(tempDir, 'textui-theme.yml');

    fs.writeFileSync(parentThemePath, `
theme:
  tokens:
    colors:
      primary:
        value: "#112233"
      secondary:
        value: "#223344"
    spacing:
      md: "1.75rem"
  components:
    button:
      primary:
        backgroundColor: "#112233"
        color: "#ffffff"
`, 'utf8');

    fs.writeFileSync(childThemePath, `
theme:
  extends: "./parent-theme.yml"
  tokens:
    colors:
      primary:
        value: "#445566"
      accent:
        value: "#778899"
    typography:
      fontSize:
        base: "15px"
  components:
    button:
      primary:
        backgroundColor: "#445566"
    alert:
      warning:
        backgroundColor: "#fff7cc"
        color: "#7a5d00"
`, 'utf8');

    await themeManager.loadTheme();

    const previewVars = parseCssVariableMap(themeManager.generateCSSVariables());
    const exportVars = buildThemeVariables(childThemePath);
    const exportStyleBlock = buildThemeStyleBlock(exportVars);

    assert.deepStrictEqual(
      previewVars,
      exportVars,
      'Preview ThemeManager and export theme-definition-resolver must produce the same CSS variable set'
    );

    [
      ['colors-primary', '#445566'],
      ['colors-secondary', '#223344'],
      ['colors-accent', '#778899'],
      ['spacing-md', '1.75rem'],
      ['typography-fontSize-base', '15px'],
      ['component-button-primary-backgroundColor', '#445566'],
      ['component-button-primary-color', '#ffffff'],
      ['component-alert-warning-backgroundColor', '#fff7cc'],
      ['component-alert-warning-color', '#7a5d00']
    ].forEach(([key, value]) => {
      assert.strictEqual(previewVars[key], value, `Expected preview/export contract to include ${key}`);
      assert.ok(
        exportStyleBlock.includes(`--${key}: ${value} !important;`),
        `Expected export theme style block to declare ${key}`
      );
    });
  });
});
