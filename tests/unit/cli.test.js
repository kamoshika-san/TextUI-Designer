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

  beforeEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(dirSampleFile), { recursive: true });
    fs.copyFileSync(sampleFile, dirSampleFile);
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
