const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createCliTestHarness } = require('../helpers/cli-test-harness');

describe('flow CLI commands', () => {
  const harness = createCliTestHarness({ tempPrefix: '.tmp-cli-flow-test-' });
  const repoRoot = harness.repoRoot;
  let tmpDir;

  beforeEach(() => {
    tmpDir = harness.createTempDir();
  });

  afterEach(() => {
    harness.cleanupTempDir(tmpDir);
  });

  it('flow validate --json validates the navigation sample', () => {
    const flowFile = path.join(repoRoot, 'sample/12-navigation/app.tui.flow.yml');
    const result = harness.runCli(['flow', 'validate', '--file', flowFile, '--json']);

    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    const parsed = JSON.parse(result.stdout);
    assert.strictEqual(parsed.valid, true);
    assert.ok(Array.isArray(parsed.issues));
  });

  it('flow export writes a deterministic react-flow artifact', () => {
    const flowFile = path.join(repoRoot, 'sample/12-navigation/app.tui.flow.yml');
    const outputPath = path.join(tmpDir, 'nav-flow.tsx');
    const result = harness.runCli([
      'flow',
      'export',
      '--file', flowFile,
      '--format', 'react-router',
      '--output', outputPath,
      '--json'
    ]);

    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    const parsed = JSON.parse(result.stdout);
    assert.strictEqual(parsed.provider, 'react-flow');
    assert.strictEqual(parsed.output, outputPath);
    assert.ok(fs.existsSync(outputPath));
    const artifact = fs.readFileSync(outputPath, 'utf8');
    assert.match(artifact, /createBrowserRouter/);
    assert.match(artifact, /Checkout Flow/);
  });

  it('flow compare --json emits machine-readable output from git revisions', function () {
    this.timeout(20000);
    const gitRepo = path.join(tmpDir, 'git-flow-compare-repo');
    fs.mkdirSync(gitRepo, { recursive: true });
    execFileSync('git', ['init'], { cwd: gitRepo, encoding: 'utf8' });
    execFileSync('git', ['config', 'user.name', 'Codex Test'], { cwd: gitRepo, encoding: 'utf8' });
    execFileSync('git', ['config', 'user.email', 'codex@example.com'], { cwd: gitRepo, encoding: 'utf8' });

    const flowPath = path.join(gitRepo, 'app.tui.flow.yml');
    fs.mkdirSync(path.join(gitRepo, 'screens'), { recursive: true });
    fs.writeFileSync(path.join(gitRepo, 'screens', 'cart.tui.yml'), 'page:\n  id: cart\n  title: Cart\n  layout: vertical\n  components: []\n', 'utf8');
    fs.writeFileSync(path.join(gitRepo, 'screens', 'shipping.tui.yml'), 'page:\n  id: shipping\n  title: Shipping\n  layout: vertical\n  components: []\n', 'utf8');
    fs.writeFileSync(path.join(gitRepo, 'screens', 'confirm.tui.yml'), 'page:\n  id: confirm\n  title: Confirm\n  layout: vertical\n  components: []\n', 'utf8');

    fs.writeFileSync(flowPath, `
flow:
  id: checkout
  title: "Checkout Flow"
  entry: cart
  screens:
    - id: cart
      page: ./screens/cart.tui.yml
      title: Cart
    - id: shipping
      page: ./screens/shipping.tui.yml
      title: Shipping
  transitions:
    - from: cart
      to: shipping
      trigger: next
      label: Continue
`, 'utf8');
    execFileSync('git', ['add', '.'], { cwd: gitRepo, encoding: 'utf8' });
    execFileSync('git', ['commit', '-m', 'base'], { cwd: gitRepo, encoding: 'utf8' });
    const baseRef = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: gitRepo, encoding: 'utf8' }).trim();

    fs.writeFileSync(flowPath, `
flow:
  id: checkout
  title: "Checkout Flow v2"
  entry: shipping
  screens:
    - id: shipping
      page: ./screens/shipping.tui.yml
      title: Shipping
    - id: confirm
      page: ./screens/confirm.tui.yml
      title: Confirm
  transitions:
    - from: shipping
      to: confirm
      trigger: next
      label: Review
`, 'utf8');
    execFileSync('git', ['add', 'app.tui.flow.yml'], { cwd: gitRepo, encoding: 'utf8' });
    execFileSync('git', ['commit', '-m', 'head'], { cwd: gitRepo, encoding: 'utf8' });
    const headRef = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: gitRepo, encoding: 'utf8' }).trim();

    const result = harness.runCli([
      'flow',
      'compare',
      '--base', baseRef,
      '--head', headRef,
      '--file', flowPath,
      '--json'
    ], { cwd: gitRepo });

    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    const parsed = JSON.parse(result.stdout);
    assert.strictEqual(parsed.kind, 'flow-semantic-diff-result/v1');
    assert.strictEqual(parsed.metadata.baseRef, baseRef);
    assert.strictEqual(parsed.metadata.headRef, headRef);
    assert.strictEqual(parsed.result.ok, true);
    assert.ok(parsed.result.semantic.summary.changed >= 1);
  });
});
