const assert = require('assert');
const path = require('path');
const Module = require('module');

describe('handleValidateCommand', () => {
  const validateCommandPath = path.resolve(__dirname, '../../out/cli/commands/validate-command.js');
  let originalStdoutWrite;
  let originalStderrWrite;
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
    const flags = options.flags || {};
    const validation = options.validation || { valid: true, files: [], issues: [] };

    const overrides = {
      '../io': {
        resolveDslFiles: () => options.filePaths || ['/workspace/sample.tui.yml'],
        resolveDslFile: (f) => path.resolve(f)
      },
      '../command-support': {
        hasFlag: (name) => Boolean(flags[name]),
        validateAcrossFiles: () => validation,
        printJson: (payload) => {
          stdoutBuffer += JSON.stringify(payload);
        }
      }
    };

    return { overrides };
  }

  function loadHandleValidateCommand(overrides) {
    const originalRequire = Module.prototype.require;
    delete require.cache[validateCommandPath];
    Module.prototype.require = function(id) {
      if (Object.prototype.hasOwnProperty.call(overrides, id)) {
        return overrides[id];
      }
      return originalRequire.apply(this, arguments);
    };

    try {
      return require(validateCommandPath).handleValidateCommand;
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

  it('returns 0 when validation passes', () => {
    const { overrides } = createModuleOverrides({ validation: { valid: true, files: [{ file: 'f.yml', valid: true }] } });
    const handleValidateCommand = loadHandleValidateCommand(overrides);
    const exitCode = handleValidateCommand({ fileArg: 'f.yml' });
    assert.strictEqual(exitCode, 0);
    assert.match(stdoutBuffer, /✔ valid/);
  });

  it('returns 2 when validation fails', () => {
    const { overrides } = createModuleOverrides({
      validation: { valid: false, issues: [{ path: '/p', message: 'err' }], files: [{ file: 'f.yml', valid: false, issues: [{ path: '/p', message: 'err' }] }] }
    });
    const handleValidateCommand = loadHandleValidateCommand(overrides);
    const exitCode = handleValidateCommand({ fileArg: 'f.yml' });
    assert.strictEqual(exitCode, 2);
    assert.match(stderrBuffer, /✖ \/p err/);
  });

  it('prints json when --json is set', () => {
    const { overrides } = createModuleOverrides({
      flags: { '--json': true },
      validation: { valid: true, issues: [] }
    });
    const handleValidateCommand = loadHandleValidateCommand(overrides);
    const exitCode = handleValidateCommand({ fileArg: 'f.yml' });
    assert.strictEqual(exitCode, 0);
    assert.match(stdoutBuffer, /"valid":true/);
  });
});
