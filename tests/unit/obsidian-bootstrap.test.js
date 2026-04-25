const assert = require('assert');

describe('obsidian bootstrap', () => {
  const bootstrap = require('../../out/bootstrap/obsidian-bootstrap.js');
  const { bootstrapObsidian, teardownObsidian } = bootstrap;

  afterEach(() => {
    teardownObsidian();
  });

  it('activates host lifecycle and runs parse validation on bootstrap', async () => {
    const calls = [];
    const hostLifecycle = {
      activate: async () => calls.push('activate'),
      deactivate: async () => calls.push('deactivate'),
    };

    await bootstrapObsidian(hostLifecycle, {
      validateParse: async () => calls.push('validate'),
      installRejectionLogger: false,
    });

    assert.deepStrictEqual(calls, ['activate', 'validate']);
  });

  it('registers command that triggers parse validation when commandId is configured', async () => {
    const calls = [];
    let commandHandler;
    const hostLifecycle = {
      activate: async () => calls.push('activate'),
      deactivate: async () => calls.push('deactivate'),
      registerCommand: (commandId, handler) => {
        calls.push(`register:${commandId}`);
        commandHandler = handler;
      },
    };

    await bootstrapObsidian(hostLifecycle, {
      commandId: 'textui.validateCurrentNote',
      validateParse: async () => calls.push('validate'),
      installRejectionLogger: false,
    });

    assert.strictEqual(typeof commandHandler, 'function');
    await commandHandler();
    assert.deepStrictEqual(calls, [
      'activate',
      'validate',
      'register:textui.validateCurrentNote',
      'validate',
    ]);
  });
});
