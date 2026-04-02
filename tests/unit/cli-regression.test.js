const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createCliTestHarness } = require('../helpers/cli-test-harness');

describe('CLI Regression Guard', () => {
  const harness = createCliTestHarness({ tempPrefix: '.tmp-cli-regression-test-' });
  let tmpDir;

  beforeEach(() => {
    tmpDir = harness.createTempDir();
  });

  afterEach(() => {
    harness.cleanupTempDir(tmpDir);
  });

  function runExport({ dslFile, provider, outputPath, deterministic = false, extraArgs = [] }) {
    const args = [
      'export',
      '--file', dslFile,
      '--provider', provider,
      '--output', outputPath,
      ...extraArgs
    ];
    if (deterministic) {
      args.push('--deterministic');
    }
    args.push('--json');
    return harness.runCli(args);
  }

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

  [
    { name: 'vue', extension: '.vue' },
    { name: 'svelte', extension: '.svelte' }
  ].forEach(provider => {
    it(`deterministic export is stable for ${provider.name} provider`, function () {
      this.timeout(10000);

      writeTokenTheme();
      const dslFile = writeTokenDsl();
      const out1 = path.join(tmpDir, `first-${provider.name}${provider.extension}`);
      const out2 = path.join(tmpDir, `second-${provider.name}${provider.extension}`);

      const first = runExport({
        dslFile,
        provider: provider.name,
        outputPath: out1,
        deterministic: true
      });

      const second = runExport({
        dslFile,
        provider: provider.name,
        outputPath: out2,
        deterministic: true
      });

      assert.strictEqual(first.status, 0, first.stderr || first.stdout);
      assert.strictEqual(second.status, 0, second.stderr || second.stdout);

      const firstContent = fs.readFileSync(out1, 'utf8');
      const secondContent = fs.readFileSync(out2, 'utf8');
      assert.strictEqual(firstContent, secondContent, `${provider.name} deterministic output mismatch`);
    });
  });

  it('export fails by default when token cannot be resolved', function () {
    this.timeout(10000);

    writeTokenTheme();
    const dslFile = writeTokenDsl('token-error-default.tui.yml', 'color.missing');
    const outputFile = path.join(tmpDir, 'default-error.html');

    const result = runExport({
      dslFile,
      provider: 'html',
      outputPath: outputFile
    });

    assert.strictEqual(result.status, 2);
    assert.strictEqual(fs.existsSync(outputFile), false);
  });

  it('export continues with --token-on-error ignore and reports no warnings in JSON', function () {
    this.timeout(10000);

    writeTokenTheme();
    const dslFile = writeTokenDsl('token-ignore.tui.yml', 'color.missing');
    const outputFile = path.join(tmpDir, 'ignore-mode.html');

    const result = runExport({
      dslFile,
      provider: 'html',
      outputPath: outputFile,
      extraArgs: ['--token-on-error', 'ignore']
    });

    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    const parsed = JSON.parse(result.stdout);
    assert.strictEqual(parsed.tokenOnError, 'ignore');
    assert.strictEqual(parsed.tokenWarnings, 0);
    assert.ok(fs.existsSync(outputFile));
  });

  it('external provider contract remains usable after built-in provider expansion', function () {
    this.timeout(10000);

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

    const result = harness.runCli([
      'export',
      '--file', dslFile,
      '--provider', 'solid',
      '--provider-module', providerModule,
      '--output', outputFile,
      '--json'
    ]);

    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    assert.ok(fs.existsSync(outputFile));
    assert.strictEqual(fs.readFileSync(outputFile, 'utf8').includes('data-provider="solid"'), true);
  });
});
