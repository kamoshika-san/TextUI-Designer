const assert = require('assert');

describe('service-runtime-phases', () => {
  it('RUNTIME_INIT_PHASES / DISPOSE_PHASES の id 順が安定している', () => {
    const { RUNTIME_INIT_PHASES, DISPOSE_PHASES } = require('../../out/services/service-runtime-phases');

    assert.deepStrictEqual(
      RUNTIME_INIT_PHASES.map(p => p.id),
      ['schema', 'commands', 'mcp', 'theme']
    );
    assert.deepStrictEqual(
      DISPOSE_PHASES.map(p => p.id),
      ['schema', 'diagnostic', 'commands', 'webview', 'theme']
    );
  });
});
