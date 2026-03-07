const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

describe('CLI Regression Guard', () => {
  const repoRoot = path.resolve(__dirname, '../..');
  const cliPath = path.join(repoRoot, 'out/cli/index.js');
  const tmpDir = path.join(repoRoot, '.tmp-cli-regression-test');

  beforeEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeTokenTheme() {
    const themeFile = path.join(tmpDir, 'textui-theme.yml');
    fs.writeFileSync(themeFile, `
theme:
  name: "Regression Theme"
  version: "1.0.0"
  tokens:
    color:
      brandPrimary: "#4F46E5"
      ctaBg: "{color.brandPrimary}"
`, 'utf8');
    return themeFile;
  }

  function writeTokenDsl(fileName = 'token-regression.tui.yml', token = 'color.ctaBg') {
    const dslFile = path.join(tmpDir, fileName);
    fs.writeFileSync(dslFile, `
page:
  id: token-regression
  title: "Token Regression"
  layout: vertical
  components:
    - Text:
        variant: h2
        value: "Regression"
        token: color.brandPrimary
    - Input:
        label: "メール"
        name: "email"
        type: email
        token: color.brandPrimary
    - Button:
        label: "送信"
        token: ${token}
`, 'utf8');
    return dslFile;
  }

  it('deterministic export is stable for vue and svelte providers', () => {
    writeTokenTheme();
    const dslFile = writeTokenDsl();

    const providers = [
      { name: 'vue', extension: '.vue' },
      { name: 'svelte', extension: '.svelte' }
    ];

    providers.forEach(provider => {
      const out1 = path.join(tmpDir, `first${provider.extension}`);
      const out2 = path.join(tmpDir, `second${provider.extension}`);

      const first = spawnSync('node', [
        cliPath,
        'export',
        '--file', dslFile,
        '--provider', provider.name,
        '--output', out1,
        '--deterministic',
        '--json'
      ], { encoding: 'utf8' });

      const second = spawnSync('node', [
        cliPath,
        'export',
        '--file', dslFile,
        '--provider', provider.name,
        '--output', out2,
        '--deterministic',
        '--json'
      ], { encoding: 'utf8' });

      assert.strictEqual(first.status, 0, first.stderr || first.stdout);
      assert.strictEqual(second.status, 0, second.stderr || second.stdout);

      const firstContent = fs.readFileSync(out1, 'utf8');
      const secondContent = fs.readFileSync(out2, 'utf8');
      assert.strictEqual(firstContent, secondContent, `${provider.name} deterministic output mismatch`);
    });
  });

  it('export fails by default when token cannot be resolved', () => {
    writeTokenTheme();
    const dslFile = writeTokenDsl('token-error-default.tui.yml', 'color.missing');
    const outputFile = path.join(tmpDir, 'default-error.html');

    const result = spawnSync('node', [
      cliPath,
      'export',
      '--file', dslFile,
      '--provider', 'html',
      '--output', outputFile,
      '--json'
    ], { encoding: 'utf8' });

    assert.strictEqual(result.status, 2);
    assert.strictEqual(fs.existsSync(outputFile), false);
  });

  it('export continues with --token-on-error ignore and reports no warnings in JSON', () => {
    writeTokenTheme();
    const dslFile = writeTokenDsl('token-ignore.tui.yml', 'color.missing');
    const outputFile = path.join(tmpDir, 'ignore-mode.html');

    const result = spawnSync('node', [
      cliPath,
      'export',
      '--file', dslFile,
      '--provider', 'html',
      '--output', outputFile,
      '--token-on-error', 'ignore',
      '--json'
    ], { encoding: 'utf8' });

    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    const parsed = JSON.parse(result.stdout);
    assert.strictEqual(parsed.tokenOnError, 'ignore');
    assert.strictEqual(parsed.tokenWarnings, 0);
    assert.ok(fs.existsSync(outputFile));
  });

  it('external provider contract remains usable after built-in provider expansion', () => {
    writeTokenTheme();
    const dslFile = writeTokenDsl('token-external.tui.yml');
    const providerModule = path.join(tmpDir, 'solid-provider.cjs');
    const outputFile = path.join(tmpDir, 'external.solid');

    fs.writeFileSync(providerModule, `
module.exports = {
  name: 'solid',
  extension: '.solid',
  version: '0.2.0',
  async render() {
    return '<main data-provider="solid">ok</main>';
  }
};
`, 'utf8');

    const result = spawnSync('node', [
      cliPath,
      'export',
      '--file', dslFile,
      '--provider', 'solid',
      '--provider-module', providerModule,
      '--output', outputFile,
      '--json'
    ], { encoding: 'utf8' });

    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    assert.ok(fs.existsSync(outputFile));
    assert.strictEqual(fs.readFileSync(outputFile, 'utf8').includes('data-provider="solid"'), true);
  });
});
