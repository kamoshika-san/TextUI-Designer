const assert = require('assert');

describe('mcp params helpers', () => {
  let params;

  before(() => {
    params = require('../../out/mcp/params');
  });

  it('requireStringParam は必須文字列を取得し、欠落時は例外', () => {
    assert.strictEqual(params.requireStringParam({ name: 'run_cli' }, 'name', 'missing'), 'run_cli');
    assert.throws(() => params.requireStringParam({}, 'name', 'missing'), /missing/);
  });

  it('parseCliResourceUri は args/cwd/timeoutMs/parseJson を解釈する', () => {
    const args = encodeURIComponent(JSON.stringify(['version']));
    const parsed = params.parseCliResourceUri(`textui://cli/run?args=${args}&cwd=/tmp&timeoutMs=1000&parseJson=false`);

    assert.deepStrictEqual(parsed, {
      args: ['version'],
      cwd: '/tmp',
      timeoutMs: 1000,
      parseJson: false
    });
  });

  it('parseCliResourceUri は不正な timeoutMs を拒否する', () => {
    const args = encodeURIComponent(JSON.stringify(['version']));
    assert.throws(
      () => params.parseCliResourceUri(`textui://cli/run?args=${args}&timeoutMs=-1`),
      /invalid timeoutMs/
    );
  });
});
