const assert = require('assert');
const path = require('path');
const Module = require('module');
const fs = require('fs');

describe('handlePlanCommand', () => {
  const planCommandPath = path.resolve(__dirname, '../../out/cli/commands/plan-command.js');
  let originalStdoutWrite;
  let stdoutBuffer;

  function installOutputCapture() {
    stdoutBuffer = '';
    originalStdoutWrite = process.stdout.write;
    process.stdout.write = (chunk) => {
      stdoutBuffer += String(chunk);
      return true;
    };
  }

  function restoreOutputCapture() {
    process.stdout.write = originalStdoutWrite;
  }

  function createModuleOverrides(options = {}) {
    const args = options.args || {};
    const flags = options.flags || {};
    const validation = options.validation || { valid: true };
    const planResult = options.planResult || { hasChanges: false, files: [] };

    const overrides = {
      '../io': {
        resolveDslFiles: () => ['/workspace/sample.tui.yml'],
        ensureDirectoryForFile: () => {}
      },
      '../state-manager': {
        DEFAULT_STATE_PATH: '/workspace/default.state.json',
        loadState: () => ({})
      },
      '../command-support': {
        getArg: (name) => args[name],
        hasFlag: (name) => Boolean(flags[name]),
        validateAcrossFiles: () => validation,
        planAcrossFiles: () => planResult,
        printJson: (payload) => {
          stdoutBuffer += JSON.stringify(payload);
        }
      }
    };

    return { overrides };
  }

  function loadHandlePlanCommand(overrides) {
    const originalRequire = Module.prototype.require;
    delete require.cache[planCommandPath];
    Module.prototype.require = function(id) {
      if (Object.prototype.hasOwnProperty.call(overrides, id)) {
        return overrides[id];
      }
      return originalRequire.apply(this, arguments);
    };

    try {
      return require(planCommandPath).handlePlanCommand;
    } finally {
      Module.prototype.require = originalRequire;
    }
  }

  beforeEach(() => {
    installOutputCapture();
  });

  afterEach(() => {
    restoreOutputCapture();
  });

  it('returns 0 when no changes found', () => {
    const { overrides } = createModuleOverrides();
    const handlePlanCommand = loadHandlePlanCommand(overrides);
    const exitCode = handlePlanCommand({ fileArg: 'f.yml' });
    assert.strictEqual(exitCode, 0);
    assert.match(stdoutBuffer, /No changes/);
  });

  it('returns 3 when changes found', () => {
    const { overrides } = createModuleOverrides({
      planResult: { hasChanges: true, files: [{ file: 'f.yml', hasChanges: true, changes: [{ op: '+', type: 'T', id: 'i', path: '/p' }] }] }
    });
    const handlePlanCommand = loadHandlePlanCommand(overrides);
    const exitCode = handlePlanCommand({ fileArg: 'f.yml' });
    assert.strictEqual(exitCode, 3);
    assert.match(stdoutBuffer, /\+ T\[id=i\] @ \/p/);
  });

  it('returns 2 when validation fails', () => {
    const { overrides } = createModuleOverrides({
      validation: { valid: false }
    });
    const handlePlanCommand = loadHandlePlanCommand(overrides);
    const exitCode = handlePlanCommand({ fileArg: 'f.yml' });
    assert.strictEqual(exitCode, 2);
  });
});
