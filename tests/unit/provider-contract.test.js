const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createCliTestHarness } = require('../helpers/cli-test-harness');

describe('Provider contract', () => {
  const harness = createCliTestHarness({ tempPrefix: '.tmp-provider-contract-test-' });
  const sampleFile = harness.sampleFile;
  let tmpDir;

  const expectedBuiltins = [
    { name: 'html', extension: '.html' },
    { name: 'pug', extension: '.pug' },
    { name: 'react', extension: '.tsx' },
    { name: 'svelte', extension: '.svelte' },
    { name: 'vue', extension: '.vue' }
  ];

  beforeEach(() => {
    tmpDir = harness.createTempDir();
  });

  afterEach(() => {
    harness.cleanupTempDir(tmpDir);
  });

  it('providers --json returns required fields and built-in set', () => {
    const result = harness.runCli(['providers', '--json']);
    assert.strictEqual(result.status, 0);

    const parsed = JSON.parse(result.stdout);
    assert.ok(Array.isArray(parsed.providers));

    const actualNames = parsed.providers.map(provider => provider.name);
    assert.deepStrictEqual(actualNames, expectedBuiltins.map(provider => provider.name));

    parsed.providers.forEach(provider => {
      assert.strictEqual(typeof provider.name, 'string');
      assert.strictEqual(typeof provider.extension, 'string');
      assert.strictEqual(typeof provider.version, 'string');
      assert.strictEqual(provider.source, 'builtin');
    });
  });

  expectedBuiltins.forEach(provider => {
    it(`${provider.name} provider exports with declared extension`, function () {
      this.timeout(10000);

      const outputPath = path.join(tmpDir, `result-${provider.name}${provider.extension}`);
      const result = harness.runCli([
        'export',
        '--file', sampleFile,
        '--provider', provider.name,
        '--output', outputPath,
        '--json'
      ]);

      assert.strictEqual(result.status, 0, `${provider.name} export failed: ${result.stderr || result.stdout}`);
      assert.ok(fs.existsSync(outputPath), `${provider.name} output missing`);
      const parsed = JSON.parse(result.stdout);
      assert.ok(parsed.output.endsWith(provider.extension), `${provider.name} extension mismatch`);
    });
  });
});
