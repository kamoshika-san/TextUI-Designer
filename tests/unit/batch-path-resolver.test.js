const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  resolveBatchOutputPath,
  resolveBatchStatePath
} = require('../../out/cli/batch-path-resolver.js');

describe('batch-path-resolver', () => {
  const repoRoot = path.resolve(__dirname, '../..');
  let tmpDir;
  let rootDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(repoRoot, '.tmp-batch-path-resolver-'));
    rootDir = path.join(tmpDir, 'dsl-root');
    fs.mkdirSync(path.join(rootDir, 'nested'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('resolves batch output paths under the default generated root', () => {
    const filePath = path.join(rootDir, 'nested', 'sample.tui.yml');

    const resolved = resolveBatchOutputPath({
      filePath,
      rootDir,
      providerExtension: '.html'
    });

    assert.strictEqual(
      resolved,
      path.resolve('generated', 'nested', 'sample.html')
    );
  });

  it('resolves batch output paths under a custom output root and strips .tui.yaml', () => {
    const outputRoot = path.join(tmpDir, 'custom-output');
    fs.mkdirSync(outputRoot, { recursive: true });
    const filePath = path.join(rootDir, 'nested', 'sample.tui.yaml');

    const resolved = resolveBatchOutputPath({
      filePath,
      rootDir,
      providerExtension: '.vue',
      outputArg: outputRoot
    });

    assert.strictEqual(
      resolved,
      path.join(path.resolve(outputRoot), 'nested', 'sample.vue')
    );
  });

  it('throws when batch output target points to an existing file', () => {
    const outputFile = path.join(tmpDir, 'not-a-dir');
    fs.writeFileSync(outputFile, 'file', 'utf8');
    const filePath = path.join(rootDir, 'nested', 'sample.tui.yml');

    assert.throws(
      () => resolveBatchOutputPath({
        filePath,
        rootDir,
        providerExtension: '.html',
        outputArg: outputFile
      }),
      /--output must be a directory when used with --dir/
    );
  });

  it('resolves batch state paths under the default state root', () => {
    const filePath = path.join(rootDir, 'nested', 'sample.tui.yml');

    const resolved = resolveBatchStatePath({
      filePath,
      rootDir
    });

    assert.strictEqual(
      resolved,
      path.resolve('.textui/state', 'nested', 'sample.state.json')
    );
  });

  it('resolves batch state paths under a custom state root and preserves nested relative paths', () => {
    const stateRoot = path.join(tmpDir, 'custom-state');
    fs.mkdirSync(stateRoot, { recursive: true });
    const filePath = path.join(rootDir, 'nested', 'sample.tui.yaml');

    const resolved = resolveBatchStatePath({
      filePath,
      rootDir,
      stateArg: stateRoot
    });

    assert.strictEqual(
      resolved,
      path.join(path.resolve(stateRoot), 'nested', 'sample.state.json')
    );
  });

  it('throws when batch state target points to an existing file', () => {
    const stateFile = path.join(tmpDir, 'not-a-dir.json');
    fs.writeFileSync(stateFile, '{}', 'utf8');
    const filePath = path.join(rootDir, 'nested', 'sample.tui.yml');

    assert.throws(
      () => resolveBatchStatePath({
        filePath,
        rootDir,
        stateArg: stateFile
      }),
      /--state must be a directory when used with --dir/
    );
  });
});
