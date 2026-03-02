const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

describe('TextUI CLI Sprint1', () => {
  const repoRoot = path.resolve(__dirname, '../..');
  const cliPath = path.join(repoRoot, 'out/cli/index.js');
  const sampleFile = path.join(repoRoot, 'sample/01-basic/sample.tui.yml');
  const tmpDir = path.join(repoRoot, '.tmp-cli-test');
  const stateFile = path.join(tmpDir, 'state.json');
  const outFile = path.join(tmpDir, 'result.html');

  beforeEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('validate --json returns valid=true for sample', () => {
    const output = execFileSync('node', [cliPath, 'validate', '--file', sampleFile, '--json'], { encoding: 'utf8' });
    const parsed = JSON.parse(output);
    assert.strictEqual(parsed.valid, true);
  });

  it('plan returns exit code 3 when state is missing and changes exist', () => {
    const result = spawnSync('node', [cliPath, 'plan', '--file', sampleFile, '--state', stateFile], { encoding: 'utf8' });
    assert.strictEqual(result.status, 3);
    assert.match(result.stdout, /\+/);
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
});
