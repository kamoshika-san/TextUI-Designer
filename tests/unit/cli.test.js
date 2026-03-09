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
  const captureOutFile = path.join(tmpDir, 'preview.png');
  const captureMockBrowser = path.join(tmpDir, 'google-chrome');
  const providerModuleFile = path.join(tmpDir, 'custom-provider.cjs');
  const invalidProviderModuleFile = path.join(tmpDir, 'invalid-provider.cjs');
  const mismatchProviderModuleFile = path.join(tmpDir, 'mismatch-provider.cjs');

  beforeEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(dirSampleFile), { recursive: true });
    fs.copyFileSync(sampleFile, dirSampleFile);
    fs.writeFileSync(providerModuleFile, `
module.exports = {
  name: 'solid',
  extension: '.solid',
  version: '0.1.0',
  async render() {
    return '<main>custom provider</main>';
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
  name: 'not-solid',
  extension: '.solid',
  version: '0.1.0',
  async render() {
    return '<div>mismatch</div>';
  }
};
`, 'utf8');

    fs.writeFileSync(captureMockBrowser, `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const screenshotArg = process.argv.find(arg => arg.startsWith('--screenshot='));
if (process.argv.includes('--version')) {
  process.stdout.write('Google Chrome 999.0.0');
  process.exit(0);
}
if (!screenshotArg) {
  process.stderr.write('missing --screenshot');
  process.exit(2);
}
const target = screenshotArg.slice('--screenshot='.length);
fs.mkdirSync(path.dirname(target), { recursive: true });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBAANQ8Z8AAAAASUVORK5CYII=', 'base64');
fs.writeFileSync(target, png);
process.exit(0);
`, 'utf8');
    fs.chmodSync(captureMockBrowser, 0o755);
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

  it('validate passes when token reference exists in theme tokens', () => {
    const tokenDslFile = path.join(tmpDir, 'token-valid.tui.yml');
    const tokenThemeFile = path.join(tmpDir, 'textui-theme.yml');
    fs.writeFileSync(tokenThemeFile, `
theme:
  name: "Token Theme"
  version: "1.0.0"
  tokens:
    color:
      primary: "#3B82F6"
`, 'utf8');
    fs.writeFileSync(tokenDslFile, `
page:
  id: token-valid
  title: "Token Valid"
  layout: vertical
  components:
    - Button:
        label: "送信"
        token: color.primary
`, 'utf8');

    const result = spawnSync('node', [cliPath, 'validate', '--file', tokenDslFile, '--json'], { encoding: 'utf8' });
    assert.strictEqual(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.strictEqual(parsed.valid, true);
  });

  it('validate fails when token is undefined', () => {
    const tokenDslFile = path.join(tmpDir, 'token-undefined.tui.yml');
    const tokenThemeFile = path.join(tmpDir, 'textui-theme.yml');
    fs.writeFileSync(tokenThemeFile, `
theme:
  name: "Token Theme"
  version: "1.0.0"
  tokens:
    color:
      primary: "#3B82F6"
`, 'utf8');
    fs.writeFileSync(tokenDslFile, `
page:
  id: token-undefined
  title: "Token Undefined"
  layout: vertical
  components:
    - Button:
        label: "送信"
        token: color.missing
`, 'utf8');

    const result = spawnSync('node', [cliPath, 'validate', '--file', tokenDslFile, '--json'], { encoding: 'utf8' });
    assert.strictEqual(result.status, 2);
    const parsed = JSON.parse(result.stdout);
    assert.strictEqual(parsed.valid, false);
    assert.ok(parsed.issues.some(issue => issue.message.includes('未定義のtoken参照')));
  });

  it('validate fails when token points to object node', () => {
    const tokenDslFile = path.join(tmpDir, 'token-type-mismatch.tui.yml');
    const tokenThemeFile = path.join(tmpDir, 'textui-theme.yml');
    fs.writeFileSync(tokenThemeFile, `
theme:
  name: "Token Theme"
  version: "1.0.0"
  tokens:
    color:
      primary: "#3B82F6"
`, 'utf8');
    fs.writeFileSync(tokenDslFile, `
page:
  id: token-type
  title: "Token Type"
  layout: vertical
  components:
    - Button:
        label: "送信"
        token: color
`, 'utf8');

    const result = spawnSync('node', [cliPath, 'validate', '--file', tokenDslFile, '--json'], { encoding: 'utf8' });
    assert.strictEqual(result.status, 2);
    const parsed = JSON.parse(result.stdout);
    assert.strictEqual(parsed.valid, false);
    assert.ok(parsed.issues.some(issue => issue.message.includes('token型不整合')));
  });

  it('validate fails when token definitions contain cyclic references', () => {
    const tokenDslFile = path.join(tmpDir, 'token-cycle.tui.yml');
    const tokenThemeFile = path.join(tmpDir, 'textui-theme.yml');
    fs.writeFileSync(tokenThemeFile, `
theme:
  name: "Token Theme"
  version: "1.0.0"
  tokens:
    color:
      primary: "{color.secondary}"
      secondary: "{color.primary}"
`, 'utf8');
    fs.writeFileSync(tokenDslFile, `
page:
  id: token-cycle
  title: "Token Cycle"
  layout: vertical
  components:
    - Button:
        label: "送信"
        token: color.primary
`, 'utf8');

    const result = spawnSync('node', [cliPath, 'validate', '--file', tokenDslFile, '--json'], { encoding: 'utf8' });
    assert.strictEqual(result.status, 2);
    const parsed = JSON.parse(result.stdout);
    assert.strictEqual(parsed.valid, false);
    assert.ok(parsed.issues.some(issue => issue.message.includes('循環参照')));
  });

  it('providers --json lists built-in providers', () => {
    const output = execFileSync('node', [cliPath, 'providers', '--json'], { encoding: 'utf8' });
    const parsed = JSON.parse(output);
    assert.ok(Array.isArray(parsed.providers));
    const names = parsed.providers.map(provider => provider.name);
    assert.deepStrictEqual(names, ['html', 'pug', 'react', 'svelte', 'vue']);
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
    assert.deepStrictEqual(names, ['html', 'pug', 'react', 'solid', 'svelte', 'vue']);
    const external = parsed.providers.find(provider => provider.name === 'solid');
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
    assert.ok(rows.some(columns => columns[0] === 'solid' && columns[1] === '.solid' && columns[2] === '0.1.0'));
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
      'angular'
    ], { encoding: 'utf8' });

    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /unsupported provider: angular/);
    assert.match(result.stderr, /supported providers: html, pug, react, svelte, vue/);
  });

  it('export supports external provider module', () => {
    const result = spawnSync('node', [
      cliPath,
      'export',
      '--file',
      sampleFile,
      '--provider',
      'solid',
      '--provider-module',
      providerModuleFile,
      '--output',
      path.join(tmpDir, 'result.solid'),
      '--json'
    ], { encoding: 'utf8' });

    assert.strictEqual(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.ok(parsed.output.endsWith('.solid'));
  });

  it('apply supports external provider module and writes provider version to state', () => {
    const stateOut = path.join(tmpDir, 'external-state.json');
    const result = spawnSync('node', [
      cliPath,
      'apply',
      '--file',
      sampleFile,
      '--provider',
      'solid',
      '--provider-module',
      providerModuleFile,
      '--output',
      path.join(tmpDir, 'applied.solid'),
      '--state',
      stateOut,
      '--auto-approve',
      '--json'
    ], { encoding: 'utf8' });

    assert.strictEqual(result.status, 0);
    const state = JSON.parse(fs.readFileSync(stateOut, 'utf8'));
    assert.strictEqual(state.provider.name, 'solid');
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
      'solid',
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
      'solid',
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

  it('apply --dir writes per-file artifacts and state files', () => {
    const rootSampleFile = path.join(tmpDir, 'root-sample.tui.yml');
    fs.copyFileSync(sampleFile, rootSampleFile);
    const outputDir = path.join(tmpDir, 'generated');
    const stateDir = path.join(tmpDir, 'state');

    const apply = spawnSync('node', [
      cliPath,
      'apply',
      '--dir',
      tmpDir,
      '--provider',
      'html',
      '--output',
      outputDir,
      '--state',
      stateDir,
      '--auto-approve',
      '--json'
    ], { encoding: 'utf8' });

    assert.strictEqual(apply.status, 0);
    const parsed = JSON.parse(apply.stdout);
    assert.strictEqual(parsed.applied, true);
    assert.strictEqual(parsed.files.length, 2);

    const nestedOutput = path.join(outputDir, 'nested', 'dir-sample.html');
    const rootOutput = path.join(outputDir, 'root-sample.html');
    const nestedState = path.join(stateDir, 'nested', 'dir-sample.state.json');
    const rootState = path.join(stateDir, 'root-sample.state.json');
    assert.ok(fs.existsSync(nestedOutput));
    assert.ok(fs.existsSync(rootOutput));
    assert.ok(fs.existsSync(nestedState));
    assert.ok(fs.existsSync(rootState));

    const rootPlan = spawnSync('node', [
      cliPath,
      'plan',
      '--file',
      rootSampleFile,
      '--state',
      rootState,
      '--json'
    ], { encoding: 'utf8' });
    assert.strictEqual(rootPlan.status, 0);
    const rootPlanParsed = JSON.parse(rootPlan.stdout);
    assert.strictEqual(rootPlanParsed.hasChanges, false);
  });

  it('apply --dir fails when --state points to an existing file', () => {
    const rootSampleFile = path.join(tmpDir, 'root-sample.tui.yml');
    fs.copyFileSync(sampleFile, rootSampleFile);
    const invalidStatePath = path.join(tmpDir, 'state.json');
    fs.writeFileSync(invalidStatePath, '{}', 'utf8');

    const apply = spawnSync('node', [
      cliPath,
      'apply',
      '--dir',
      tmpDir,
      '--state',
      invalidStatePath,
      '--auto-approve'
    ], { encoding: 'utf8' });

    assert.strictEqual(apply.status, 1);
    assert.match(apply.stderr, /--state must be a directory when used with --dir/);
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

  it('capture writes preview image using mock browser', () => {
    const result = spawnSync('node', [
      cliPath,
      'capture',
      '--file',
      sampleFile,
      '--output',
      captureOutFile,
      '--browser',
      'google-chrome',
      '--json'
    ], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${tmpDir}${path.delimiter}${process.env.PATH || ''}`
      }
    });

    assert.strictEqual(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.strictEqual(parsed.captured, true);
    assert.ok(fs.existsSync(captureOutFile));
    assert.ok(parsed.browserPath.endsWith('google-chrome'));
  });

  it('export resolves token value into HTML inline style', () => {
    const tokenDslFile = path.join(tmpDir, 'token-export.tui.yml');
    const tokenThemeFile = path.join(tmpDir, 'textui-theme.yml');
    const tokenOutFile = path.join(tmpDir, 'token-export.html');
    fs.writeFileSync(tokenThemeFile, `
theme:
  name: "Token Theme"
  version: "1.0.0"
  tokens:
    color:
      primary: "#123456"
`, 'utf8');
    fs.writeFileSync(tokenDslFile, `
page:
  id: token-export
  title: "Token Export"
  layout: vertical
  components:
    - Button:
        label: "送信"
        token: color.primary
`, 'utf8');

    const result = spawnSync('node', [
      cliPath,
      'export',
      '--file',
      tokenDslFile,
      '--provider',
      'html',
      '--output',
      tokenOutFile
    ], { encoding: 'utf8' });

    assert.strictEqual(result.status, 0);
    const html = fs.readFileSync(tokenOutFile, 'utf8');
    assert.match(html, /background-color:\s*#123456/);
  });

  it('export with --token-on-error warn succeeds and reports token warnings', () => {
    const tokenDslFile = path.join(tmpDir, 'token-warn-export.tui.yml');
    const tokenThemeFile = path.join(tmpDir, 'textui-theme.yml');
    const tokenOutFile = path.join(tmpDir, 'token-warn-export.html');
    fs.writeFileSync(tokenThemeFile, `
theme:
  name: "Token Theme"
  version: "1.0.0"
  tokens:
    color:
      primary: "#3B82F6"
`, 'utf8');
    fs.writeFileSync(tokenDslFile, `
page:
  id: token-warn-export
  title: "Token Warn Export"
  layout: vertical
  components:
    - Button:
        label: "送信"
        token: color.missing
`, 'utf8');

    const result = spawnSync('node', [
      cliPath,
      'export',
      '--file',
      tokenDslFile,
      '--provider',
      'html',
      '--output',
      tokenOutFile,
      '--token-on-error',
      'warn',
      '--json'
    ], { encoding: 'utf8' });

    assert.strictEqual(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.strictEqual(parsed.tokenOnError, 'warn');
    assert.ok(parsed.tokenWarnings > 0);
    assert.ok(fs.existsSync(tokenOutFile));
  });

  it('apply with --token-on-error warn succeeds and writes state', () => {
    const tokenDslFile = path.join(tmpDir, 'token-warn-apply.tui.yml');
    const tokenThemeFile = path.join(tmpDir, 'textui-theme.yml');
    const tokenStateFile = path.join(tmpDir, 'token-warn-apply.state.json');
    const tokenOutFile = path.join(tmpDir, 'token-warn-apply.html');
    fs.writeFileSync(tokenThemeFile, `
theme:
  name: "Token Theme"
  version: "1.0.0"
  tokens:
    color:
      primary: "#3B82F6"
`, 'utf8');
    fs.writeFileSync(tokenDslFile, `
page:
  id: token-warn-apply
  title: "Token Warn Apply"
  layout: vertical
  components:
    - Button:
        label: "送信"
        token: color.missing
`, 'utf8');

    const result = spawnSync('node', [
      cliPath,
      'apply',
      '--file',
      tokenDslFile,
      '--provider',
      'html',
      '--output',
      tokenOutFile,
      '--state',
      tokenStateFile,
      '--auto-approve',
      '--token-on-error',
      'warn',
      '--json'
    ], { encoding: 'utf8' });

    assert.strictEqual(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.strictEqual(parsed.tokenOnError, 'warn');
    assert.ok(parsed.tokenWarnings > 0);
    assert.ok(fs.existsSync(tokenOutFile));
    assert.ok(fs.existsSync(tokenStateFile));
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
    const updated = original.replace('label: "Submit"', 'label: "送信"');
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
    fs.writeFileSync(workingFile, original.replace('label: "Submit"', 'label: "Submit Form"'), 'utf8');

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
      // 直接上書きすると読み手が途中状態を読むことがあり、CIでまれにJSONパースエラーになる。
      // テストは「競合検知」を検証したいので、常に完全なJSONを原子的に差し替える。
      const tempStatePath = `${stateFile}.tmp-${process.pid}-${tick}`;
      fs.writeFileSync(tempStatePath, JSON.stringify(nextState, null, 2));
      fs.renameSync(tempStatePath, stateFile);
      tick += 1;
    };

    setTimeout(writeConflictState, 0);
    const timer = setInterval(writeConflictState, 2);

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
