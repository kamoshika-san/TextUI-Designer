const assert = require('assert');

const { DiagnosticScheduler } = require('../../out/services/diagnostics/diagnostic-scheduler');

describe('DiagnosticScheduler', () => {
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
});
