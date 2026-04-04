const assert = require('assert');
const path = require('path');
const Module = require('module');

describe('handleStateCommand', () => {
  const stateCommandPath = path.resolve(__dirname, '../../out/cli/commands/state-command.js');
  let originalStdoutWrite;
  let originalStderrWrite;
  let originalArgv;
  let stdoutBuffer;
  let stderrBuffer;

  function installOutputCapture() {
    stdoutBuffer = '';
    stderrBuffer = '';
    originalStdoutWrite = process.stdout.write;
    originalStderrWrite = process.stderr.write;
    process.stdout.write = (chunk) => {
      stdoutBuffer += String(chunk);
      return true;
    };
    process.stderr.write = (chunk) => {
      stderrBuffer += String(chunk);
      return true;
    };
  }

  function restoreOutputCapture() {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }

  function createModuleOverrides(options = {}) {
    const args = options.args || {};
    const flags = options.flags || {};
    const state = options.state === undefined ? { resources: [] } : options.state;

    const overrides = {
      '../state-manager': {
        DEFAULT_STATE_PATH: '/workspace/default.state.json',
        loadState: () => state,
        saveState: () => {},
        stateToStableJson: (s) => JSON.stringify(s)
      },
      '../command-support': {
        getArg: (name) => args[name],
        hasFlag: (name) => Boolean(flags[name]),
        loadStatePayload: () => options.payload || {},
        printJson: (payload) => {
          stdoutBuffer += JSON.stringify(payload);
        }
      }
    };

    return { overrides };
  }

  function loadHandleStateCommand(overrides) {
    const originalRequire = Module.prototype.require;
    delete require.cache[stateCommandPath];
    Module.prototype.require = function(id) {
      if (Object.prototype.hasOwnProperty.call(overrides, id)) {
        return overrides[id];
      }
      return originalRequire.apply(this, arguments);
    };

    try {
      return require(stateCommandPath).handleStateCommand;
    } finally {
      Module.prototype.require = originalRequire;
    }
  }

  beforeEach(() => {
    installOutputCapture();
    originalArgv = process.argv;
  });

  afterEach(() => {
    restoreOutputCapture();
    process.argv = originalArgv;
  });

  it('shows state by default', () => {
    const { overrides } = createModuleOverrides({ state: { resources: [], ver: 1 } });
    const handleStateCommand = loadHandleStateCommand(overrides);
    process.argv = ['node', 'cli', 'state'];
    const exitCode = handleStateCommand();
    assert.strictEqual(exitCode, 0);
    assert.match(stdoutBuffer, /"ver":1/);
  });

  it('pushes state from input', () => {
    const { overrides } = createModuleOverrides({ payload: { resources: [1, 2] } });
    const handleStateCommand = loadHandleStateCommand(overrides);
    process.argv = ['node', 'cli', 'state', 'push'];
    const exitCode = handleStateCommand();
    assert.strictEqual(exitCode, 0);
    assert.match(stdoutBuffer, /state pushed/);
  });

  it('removes resource by id', () => {
    const { overrides } = createModuleOverrides({
      state: { resources: [{ id: 'r1' }] },
      args: { '--id': 'r1' }
    });
    const handleStateCommand = loadHandleStateCommand(overrides);
    process.argv = ['node', 'cli', 'state', 'rm'];
    const exitCode = handleStateCommand();
    assert.strictEqual(exitCode, 0);
    assert.match(stdoutBuffer, /removed 1 resource/);
  });

  it('returns 1 for unsupported sub-command', () => {
    const { overrides } = createModuleOverrides();
    const handleStateCommand = loadHandleStateCommand(overrides);
    process.argv = ['node', 'cli', 'state', 'invalid'];
    const exitCode = handleStateCommand();
    assert.strictEqual(exitCode, 1);
    assert.match(stderrBuffer, /unsupported state command/);
  });
});
