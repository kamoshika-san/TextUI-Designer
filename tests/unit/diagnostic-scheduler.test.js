const assert = require('assert');
const { Logger } = require('../../out/utils/logger');

const { DiagnosticScheduler } = require('../../out/services/diagnostics/diagnostic-scheduler');

describe('DiagnosticScheduler', () => {
  let originalLoggerError;
  let loggedMessages;

  beforeEach(() => {
    loggedMessages = [];
    originalLoggerError = Logger.prototype.error;
    Logger.prototype.error = function(message, ...args) {
      loggedMessages.push([message, ...args].map(value => String(value)).join(' '));
    };
  });

  afterEach(() => {
    Logger.prototype.error = originalLoggerError;
  });

  it('only runs the latest scheduled task', async () => {
    const scheduler = new DiagnosticScheduler();
    const executed = [];

    scheduler.schedule(async () => {
      executed.push('first');
    }, 30);

    scheduler.schedule(async () => {
      executed.push('second');
    }, 30);

    await new Promise(resolve => setTimeout(resolve, 80));

    assert.deepStrictEqual(executed, ['second']);
    scheduler.clear();
  });

  it('clear cancels pending execution', async () => {
    const scheduler = new DiagnosticScheduler();
    let executed = false;

    scheduler.schedule(async () => {
      executed = true;
    }, 30);

    scheduler.clear();
    await new Promise(resolve => setTimeout(resolve, 80));

    assert.strictEqual(executed, false);
  });

  it('logs scheduled task failures with structured error output', async () => {
    const scheduler = new DiagnosticScheduler();

    scheduler.schedule(async () => {
      throw new Error('scheduled boom');
    }, 10);

    await new Promise(resolve => setTimeout(resolve, 80));

    assert.ok(loggedMessages.some(line => line.includes('Scheduled diagnostic task failed:')));
    assert.ok(loggedMessages.some(line => line.includes('scheduled boom')));
    scheduler.clear();
  });
});
