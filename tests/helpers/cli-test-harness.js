'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function createCliTestHarness(options = {}) {
  const repoRoot = path.resolve(__dirname, '../..');
  const cliPath = path.join(repoRoot, 'out/cli/index.js');
  const sampleFile = path.join(repoRoot, 'sample/01-basic/sample.tui.yml');
  const tempPrefix = options.tempPrefix || '.tmp-cli-test-';

  function createTempDir() {
    return fs.mkdtempSync(path.join(repoRoot, tempPrefix));
  }

  function cleanupTempDir(tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  function runCli(args, spawnOptions = {}) {
    return spawnSync('node', [cliPath, ...args], {
      encoding: 'utf8',
      ...spawnOptions
    });
  }

  return {
    repoRoot,
    cliPath,
    sampleFile,
    createTempDir,
    cleanupTempDir,
    runCli
  };
}

module.exports = { createCliTestHarness };
