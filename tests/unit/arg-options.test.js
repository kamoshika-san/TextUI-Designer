const assert = require('assert');
const path = require('path');
const fs = require('fs');
const Module = require('module');

describe('arg-options', () => {
  const argOptionsPath = path.resolve(__dirname, '../../out/cli/arg-options.js');
  let originalArgv;

  function loadArgOptions() {
    delete require.cache[argOptionsPath];
    return require(argOptionsPath);
  }

  beforeEach(() => {
    originalArgv = process.argv;
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  it('parseTokenErrorMode validation', () => {
    const { parseTokenErrorMode } = loadArgOptions();
    process.argv = ['node', 'cli', '--token-on-error', 'WARN'];
    assert.strictEqual(parseTokenErrorMode(), 'warn');

    process.argv = ['node', 'cli', '--token-on-error', 'invalid'];
    assert.throws(() => parseTokenErrorMode(), /invalid --token-on-error/);
  });

  it('parseOptionalPositiveInt validation', () => {
    const { parseOptionalPositiveInt } = loadArgOptions();
    process.argv = ['node', 'cli', '--wait-ms', '100'];
    assert.strictEqual(parseOptionalPositiveInt('--wait-ms'), 100);

    process.argv = ['node', 'cli', '--wait-ms', '0'];
    assert.throws(() => parseOptionalPositiveInt('--wait-ms'), /expected positive integer/);

    process.argv = ['node', 'cli', '--wait-ms', 'abc'];
    assert.throws(() => parseOptionalPositiveInt('--wait-ms'), /expected positive integer/);
  });

  it('parseOptionalPositiveNumber validation', () => {
    const { parseOptionalPositiveNumber } = loadArgOptions();
    process.argv = ['node', 'cli', '--scale', '1.5'];
    assert.strictEqual(parseOptionalPositiveNumber('--scale'), 1.5);

    process.argv = ['node', 'cli', '--scale', '-1'];
    assert.throws(() => parseOptionalPositiveNumber('--scale'), /expected positive number/);
  });

  it('parseOptionalNonNegativeInt validation', () => {
    const { parseOptionalNonNegativeInt } = loadArgOptions();
    process.argv = ['node', 'cli', '--count', '0'];
    assert.strictEqual(parseOptionalNonNegativeInt('--count'), 0);

    process.argv = ['node', 'cli', '--count', '-1'];
    assert.throws(() => parseOptionalNonNegativeInt('--count'), /expected non-negative integer/);
  });
});
