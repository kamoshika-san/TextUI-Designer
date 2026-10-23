/**
 * Real VS Code smoke の再試行判定。
 * CI では update.code.visualstudio.com への接続が AggregateError(code=ETIMEDOUT) で
 * 落ちることがある。message と stack にはその code が出ない。
 */

const assert = require('assert');
const { isRetryableError } = require('../vscode-smoke/retryable-error');

function connectAggregateError() {
  const ipv4 = Object.assign(new Error('connect ETIMEDOUT 150.171.109.113:443'), {
    code: 'ETIMEDOUT',
    syscall: 'connect'
  });
  const ipv6 = Object.assign(
    new Error('connect ENETUNREACH 2603:1061:14:49::1:443 - Local (:::0)'),
    { code: 'ENETUNREACH', syscall: 'connect' }
  );
  const error = new AggregateError([ipv4, ipv6], '');
  error.code = 'ETIMEDOUT';
  return error;
}

describe('vscode smoke retry classification', () => {
  it('retries AggregateError ETIMEDOUT from the VS Code update service', () => {
    const error = connectAggregateError();
    assert.strictEqual(error.message, '');
    assert.strictEqual(error.stack.split('\n')[0], 'AggregateError');
    assert.strictEqual(isRetryableError(error), true);
  });

  it('retries a nested ENETUNREACH when the outer error has no code', () => {
    const nested = Object.assign(new Error('connect ENETUNREACH'), { code: 'ENETUNREACH' });
    const error = new AggregateError([nested], '');
    assert.strictEqual(isRetryableError(error), true);
  });

  it('retries an ECONNRESET wrapped as error.cause', () => {
    const error = new Error('download failed');
    error.cause = Object.assign(new Error('socket closed'), { code: 'ECONNRESET' });
    assert.strictEqual(isRetryableError(error), true);
  });

  it('retries the existing update-service failures', () => {
    assert.strictEqual(isRetryableError('Failed to get JSON'), true);
    assert.strictEqual(
      isRetryableError(new Error(
        'Failed to parse response from https://update.code.visualstudio.com/api/releases/stable'
      )),
      true
    );
    assert.strictEqual(
      isRetryableError(new Error('@vscode/test-electron request timeout out after 15000ms')),
      true
    );
    assert.strictEqual(
      isRetryableError(new Error('Expected TextUI preview command to create a webview tab')),
      true
    );
  });

  it('does not retry an ordinary test failure', () => {
    assert.strictEqual(isRetryableError(new Error('preview HTML was empty')), false);
  });
});
