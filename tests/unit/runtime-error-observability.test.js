const assert = require('assert');
const path = require('path');

describe('runtime-error-observability', () => {
  const modulePath = path.resolve(__dirname, '../../out/utils/runtime-error-observability.js');
  const loggerPath = path.resolve(__dirname, '../../out/utils/logger.js');
  const originalProcessOn = process.on;

  afterEach(() => {
    const handler = process[Symbol.for('textui.runtimeErrorObservability.unhandledRejection')];
    if (handler) {
      process.removeListener('unhandledRejection', handler);
    }
    process.on = originalProcessOn;
    delete process[Symbol.for('textui.runtimeErrorObservability.unhandledRejection')];
    delete require.cache[modulePath];
    delete require.cache[loggerPath];
  });

  it('installs the unhandledRejection logger only once per process', () => {
    let registrations = 0;
    process.on = function(event, handler) {
      if (event === 'unhandledRejection') {
        registrations += 1;
      }
      return originalProcessOn.call(this, event, handler);
    };

    const { installUnhandledRejectionLogger } = require(modulePath);
    installUnhandledRejectionLogger('CLI');
    installUnhandledRejectionLogger('CLI');

    assert.strictEqual(registrations, 1);
  });

  it('logs unhandled rejection reason and stack through structured logger output', () => {
    const errors = [];
    const { Logger } = require(loggerPath);
    const originalLoggerError = Logger.prototype.error;
    Logger.prototype.error = function(message, ...args) {
      errors.push({ scope: this.scope, message, args });
    };

    try {
      const { installUnhandledRejectionLogger } = require(modulePath);
      installUnhandledRejectionLogger('CLI');

      const handler = process[Symbol.for('textui.runtimeErrorObservability.unhandledRejection')];
      const err = new Error('boom');
      handler(err);

      assert.ok(errors.some(entry => entry.message.includes('Unhandled promise rejection: boom')));
      assert.ok(errors.some(entry => entry.message.includes('Unhandled promise rejection stack:')));
    } finally {
      Logger.prototype.error = originalLoggerError;
    }
  });
});
