const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

describe('TextUI CLI Sprint1', () => {
  const repoRoot = path.resolve(__dirname, '../..');
  const cliPath = path.join(repoRoot, 'out/cli/index.js');
  const sampleFile = path.join(repoRoot, 'sample/01-basic/sample.tui.yml');
  const tmpDir = path.join(repoRoot, '.tmp-cli-test');
  const dirSampleFile = path.join(tmpDir, 'nested', 'dir-sample.tui.yml');
  const stateFile = path.join(tmpDir, 'state.json');
  const outFile = path.join(tmpDir, 'result.html');
  const providerModuleFile = path.join(tmpDir, 'custom-provider.cjs');
  const invalidProviderModuleFile = path.join(tmpDir, 'invalid-provider.cjs');
  const mismatchProviderModuleFile = path.join(tmpDir, 'mismatch-provider.cjs');

  beforeEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(dirSampleFile), { recursive: true });
    fs.copyFileSync(sampleFile, dirSampleFile);
    fs.writeFileSync(providerModuleFile, `
module.exports = {
  name: 'vue',
  extension: '.vue',
  version: '0.1.0',
  async render() {
    return '<template><main>custom provider</main></template>';
  }
};
`, 'utf8');

    fs.writeFileSync(invalidProviderModuleFile, `
module.exports = {
  name: 'broken',
  extension: '.broken',
  version: '0.0.1'
};
`, 'utf8');

    fs.writeFileSync(mismatchProviderModuleFile, `
module.exports = {
  name: 'not-vue',
  extension: '.vue',
  version: '0.1.0',
  async render() {
    return '<div>mismatch</div>';
  }
};
`, 'utf8');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('validate --json returns valid=true for sample', () => {
    const output = execFileSync('node', [cliPath, 'validate', '--file', sampleFile, '--json'], { encoding: 'utf8' });
    const parsed = JSON.parse(output);
    assert.strictEqual(parsed.valid, true);
  });

  it('validate --dir --json validates all DSL files recursively', () => {
    const output = execFileSync('node', [cliPath, 'validate', '--dir', tmpDir, '--json'], { encoding: 'utf8' });
    const parsed = JSON.parse(output);
    assert.strictEqual(parsed.valid, true);
    assert.ok(Array.isArray(parsed.files));
    assert.strictEqual(parsed.files.length, 1);
    assert.strictEqual(parsed.files[0].file, dirSampleFile);
  });


  it('validate detects cyclic include as invalid', () => {
    const cyclicSampleFile = path.join(repoRoot, 'sample/04-include-cyclic/cycle-test.tui.yml');
    const result = spawnSync('node', [cliPath, 'validate', '--file', cyclicSampleFile, '--json'], { encoding: 'utf8' });

    assert.strictEqual(result.status, 2);
    const parsed = JSON.parse(result.stdout);
    assert.strictEqual(parsed.valid, false);
    assert.ok(parsed.issues.some(issue => issue.message.includes('循環参照を検出しました')));
  });

  it('providers --json lists built-in providers', () => {
    const output = execFileSync('node', [cliPath, 'providers', '--json'], { encoding: 'utf8' });
    const parsed = JSON.parse(output);
    assert.ok(Array.isArray(parsed.providers));
    const names = parsed.providers.map(provider => provider.name);
    assert.deepStrictEqual(names, ['html', 'pug', 'react']);
  });

  it('providers --provider-module includes external provider', () => {
    const output = execFileSync('node', [
      cliPath,
      'providers',
      '--provider-module',
      providerModuleFile,
      '--json'
    ], { encoding: 'utf8' });

    const parsed = JSON.parse(output);
    const names = parsed.providers.map(provider => provider.name);
    assert.deepStrictEqual(names, ['html', 'pug', 'react', 'vue']);
    const external = parsed.providers.find(provider => provider.name === 'vue');
    assert.strictEqual(external.source, 'external');
  });

  it('providers plain output keeps 3-column compatibility even with --provider-module', () => {
    const output = execFileSync('node', [
      cliPath,
      'providers',
      '--provider-module',
      providerModuleFile
    ], { encoding: 'utf8' });

    const rows = output.trim().split('\n').map(line => line.split('\t'));
    assert.ok(rows.length >= 4);
    rows.forEach(columns => {
      assert.strictEqual(columns.length, 3);
    });
    assert.ok(rows.some(columns => columns[0] === 'vue' && columns[1] === '.vue' && columns[2] === '0.1.0'));
  });

  it('help output includes provider-module option', () => {
    const output = execFileSync('node', [cliPath, '--help'], { encoding: 'utf8' });
    assert.match(output, /--provider-module <path>/);
  });

  it('export returns exit code 1 with supported provider hint when provider is unknown', () => {
    const result = spawnSync('node', [
      cliPath,
      'export',
      '--file',
      sampleFile,
      '--provider',
      'vue'
    ], { encoding: 'utf8' });

    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /unsupported provider: vue/);
    assert.match(result.stderr, /supported providers: html, pug, react/);
  });

  it('export supports external provider module', () => {
    const result = spawnSync('node', [
      cliPath,
      'export',
      '--file',
      sampleFile,
      '--provider',
      'vue',
      '--provider-module',
      providerModuleFile,
      '--output',
      path.join(tmpDir, 'result.vue'),
      '--json'
    ], { encoding: 'utf8' });

    assert.strictEqual(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.ok(parsed.output.endsWith('.vue'));
  });

  it('apply supports external provider module and writes provider version to state', () => {
    const stateOut = path.join(tmpDir, 'external-state.json');
    const result = spawnSync('node', [
      cliPath,
      'apply',
      '--file',
      sampleFile,
      '--provider',
      'vue',
      '--provider-module',
      providerModuleFile,
      '--output',
      path.join(tmpDir, 'applied.vue'),
      '--state',
      stateOut,
      '--auto-approve',
      '--json'
    ], { encoding: 'utf8' });

    assert.strictEqual(result.status, 0);
    const state = JSON.parse(fs.readFileSync(stateOut, 'utf8'));
    assert.strictEqual(state.provider.name, 'vue');
    assert.strictEqual(state.provider.version, '0.1.0');
  });

  it('export fails when provider module shape is invalid', () => {
    const result = spawnSync('node', [
      cliPath,
      'export',
      '--file',
      sampleFile,
      '--provider',
      'broken',
      '--provider-module',
      invalidProviderModuleFile
    ], { encoding: 'utf8' });

    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /invalid provider module/);
  });

  it('export fails when --provider does not match provider module name', () => {
    const result = spawnSync('node', [
      cliPath,
      'export',
      '--file',
      sampleFile,
      '--provider',
      'vue',
      '--provider-module',
      mismatchProviderModuleFile
    ], { encoding: 'utf8' });

    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /provider module name mismatch/);
  });

  it('export fails when provider module file does not exist', () => {
    const result = spawnSync('node', [
      cliPath,
      'export',
      '--file',
      sampleFile,
      '--provider',
      'vue',
      '--provider-module',
      path.join(tmpDir, 'does-not-exist.cjs')
    ], { encoding: 'utf8' });

    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /provider module not found/);
  });

  it('plan returns exit code 3 when state is missing and changes exist', () => {
    const result = spawnSync('node', [cliPath, 'plan', '--file', sampleFile, '--state', stateFile], { encoding: 'utf8' });
    assert.strictEqual(result.status, 3);
    assert.match(result.stdout, /\+/);
  });

  it('plan --dir --json returns per-file plan summary', () => {
    const result = spawnSync('node', [cliPath, 'plan', '--dir', tmpDir, '--state', stateFile, '--json'], { encoding: 'utf8' });
    assert.strictEqual(result.status, 3);
    const parsed = JSON.parse(result.stdout);
    assert.strictEqual(parsed.hasChanges, true);
    assert.ok(Array.isArray(parsed.files));
    assert.strictEqual(parsed.files.length, 1);
    assert.strictEqual(parsed.files[0].file, dirSampleFile);
    assert.strictEqual(parsed.files[0].hasChanges, true);
  });


  it('export --deterministic includes deterministic=true in JSON output', () => {
    const output = execFileSync('node', [
      cliPath,
      'export',
      '--file',
      sampleFile,
      '--provider',
      'html',
      '--output',
      outFile,
      '--deterministic',
      '--json'
    ], { encoding: 'utf8' });

    const parsed = JSON.parse(output);
    assert.strictEqual(parsed.deterministic, true);
    assert.ok(fs.existsSync(outFile));
  });

  it('plan includes changed field details when state has snapshots', () => {
    const workingFile = path.join(tmpDir, 'working.tui.yml');
    fs.copyFileSync(sampleFile, workingFile);

    const apply = spawnSync('node', [
      cliPath,
      'apply',
      '--file',
      workingFile,
      '--provider',
      'html',
      '--output',
      outFile,
      '--state',
      stateFile,
      '--auto-approve'
    ], { encoding: 'utf8' });
    assert.strictEqual(apply.status, 0);

    const original = fs.readFileSync(workingFile, 'utf8');
    const updated = original.replace('label: "ログイン"', 'label: "サインイン"');
    fs.writeFileSync(workingFile, updated, 'utf8');

    const plan = spawnSync('node', [
      cliPath,
      'plan',
      '--file',
      workingFile,
      '--state',
      stateFile,
      '--json'
    ], { encoding: 'utf8' });

    assert.strictEqual(plan.status, 3);
    const parsed = JSON.parse(plan.stdout);
    const updateChange = parsed.changes.find(change => change.op === '~');
    assert.ok(updateChange);
    assert.match(updateChange.details || '', /fields changed: actions/);
  });

  it('apply writes artifact and state, then plan returns 0', () => {
    const apply = spawnSync('node', [
      cliPath,
      'apply',
      '--file',
      sampleFile,
      '--provider',
      'html',
      '--output',
      outFile,
      '--state',
      stateFile,
      '--auto-approve'
    ], { encoding: 'utf8' });

    assert.strictEqual(apply.status, 0);
    assert.ok(fs.existsSync(outFile));
    assert.ok(fs.existsSync(stateFile));

    const plan = spawnSync('node', [cliPath, 'plan', '--file', sampleFile, '--state', stateFile], { encoding: 'utf8' });
    assert.strictEqual(plan.status, 0);
    assert.match(plan.stdout, /No changes/);
  });

  it('apply returns exit code 4 when state changes during execution', async () => {
    const workingFile = path.join(tmpDir, 'conflict.tui.yml');
    fs.copyFileSync(sampleFile, workingFile);

    const firstApply = spawnSync('node', [
      cliPath,
      'apply',
      '--file',
      workingFile,
      '--provider',
      'html',
      '--output',
      outFile,
      '--state',
      stateFile,
      '--auto-approve'
    ], { encoding: 'utf8' });
    assert.strictEqual(firstApply.status, 0);

    const original = fs.readFileSync(workingFile, 'utf8');
    fs.writeFileSync(workingFile, original.replace('label: "ログイン"', 'label: "ログインする"'), 'utf8');

    const child = require('child_process').spawn('node', [
      cliPath,
      'apply',
      '--file',
      workingFile,
      '--provider',
      'html',
      '--output',
      outFile,
      '--state',
      stateFile,
      '--auto-approve',
      '--deterministic'
    ], { encoding: 'utf8' });

    let stderr = '';
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    const baseState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    let tick = 0;
    const writeConflictState = () => {
      const nextState = {
        ...baseState,
        meta: {
          ...baseState.meta,
          lastApply: new Date(Date.now() + 60_000 + tick).toISOString()
        }
      };
      fs.writeFileSync(stateFile, JSON.stringify(nextState, null, 2));
      tick += 1;
    };

    setTimeout(writeConflictState, 5);
    const timer = setInterval(writeConflictState, 10);

    const status = await new Promise(resolve => {
      child.on('close', code => resolve(code));
    });

    clearInterval(timer);
    assert.strictEqual(status, 4);
    assert.match(stderr, /state conflict detected/);
  });

  it('state push writes state file from --input and state rm deletes a resource by id', () => {
    const pushPayload = {
      version: 1,
      dsl: {
        entry: 'sample/01-basic/sample.tui.yml',
        hash: 'sha256:test',
        updatedAt: '2026-01-01T00:00:00.000Z'
      },
      provider: {
        name: 'html',
        version: '1.0.0'
      },
      resources: [
        {
          id: 'resource-1',
          type: 'Text',
          path: 'page.components[0]',
          hash: 'sha256:resource-1'
        }
      ],
      artifacts: [],
      meta: {
        cliVersion: '0.1.0',
        lastApply: '2026-01-01T00:00:00.000Z'
      }
    };

    const payloadFile = path.join(tmpDir, 'push.json');
    fs.writeFileSync(payloadFile, JSON.stringify(pushPayload, null, 2));

    const push = spawnSync('node', [
      cliPath,
      'state',
      'push',
      '--state',
      stateFile,
      '--input',
      payloadFile,
      '--json'
    ], { encoding: 'utf8' });
    assert.strictEqual(push.status, 0);

    const show = execFileSync('node', [cliPath, 'state', 'show', '--state', stateFile, '--json'], { encoding: 'utf8' });
    const shown = JSON.parse(show);
    assert.strictEqual(shown.resources.length, 1);

    const rm = spawnSync('node', [
      cliPath,
      'state',
      'rm',
      '--state',
      stateFile,
      '--id',
      'resource-1',
      '--json'
    ], { encoding: 'utf8' });

    assert.strictEqual(rm.status, 0);
    const rmParsed = JSON.parse(rm.stdout);
    assert.strictEqual(rmParsed.removed, 1);

    const after = execFileSync('node', [cliPath, 'state', 'show', '--state', stateFile, '--json'], { encoding: 'utf8' });
    const afterParsed = JSON.parse(after);
    assert.strictEqual(afterParsed.resources.length, 0);
  });
});
