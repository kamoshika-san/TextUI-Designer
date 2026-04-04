const assert = require('assert');
const path = require('path');
const fs = require('fs');

describe('command-support', () => {
  const commandSupportPath = path.resolve(__dirname, '../../out/cli/command-support.js');

  function loadCommandSupport() {
    delete require.cache[commandSupportPath];
    return require(commandSupportPath);
  }

  it('emitTokenWarnings writes to stderr', () => {
    const { emitTokenWarnings } = loadCommandSupport();
    let stderr = '';
    const originalStderrWrite = process.stderr.write;
    process.stderr.write = (chunk) => {
      stderr += String(chunk);
      return true;
    };
    try {
      emitTokenWarnings([{ path: 'p1', message: 'm1' }]);
      assert.match(stderr, /⚠ token p1 m1/);
    } finally {
      process.stderr.write = originalStderrWrite;
    }
  });

  it('printHelp writes to stdout', () => {
    const { printHelp } = loadCommandSupport();
    let stdout = '';
    const originalStdoutWrite = process.stdout.write;
    process.stdout.write = (chunk) => {
      stdout += String(chunk);
      return true;
    };
    try {
      printHelp();
      assert.match(stdout, /Usage: textui/);
    } finally {
      process.stdout.write = originalStdoutWrite;
    }
  });
});
