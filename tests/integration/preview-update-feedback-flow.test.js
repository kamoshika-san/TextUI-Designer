const assert = require('assert');
const path = require('path');

describe('preview update feedback flow integration', () => {
  const {
    createPreviewUpdateFeedbackController
  } = require(path.resolve(__dirname, '../../out/renderer/preview-update-feedback-controller.js'));

  it('keeps short refreshes invisible while still completing cleanly', () => {
    const statusLog = [];
    const completedAtLog = [];
    let scheduledCallback = null;

    const controller = createPreviewUpdateFeedbackController({
      setUpdateStatus: (value) => {
        statusLog.push(typeof value === 'function' ? value(statusLog.at(-1) ?? 'idle') : value);
      },
      setLastCompletedAt: (value) => {
        completedAtLog.push(value);
      },
      now: () => 1_234,
      schedule: (callback) => {
        scheduledCallback = callback;
        return 1;
      },
      clearScheduled: () => {
        scheduledCallback = null;
      }
    });

    controller.handlePreviewUpdating();
    controller.handlePreviewComplete();

    assert.deepStrictEqual(statusLog, ['idle']);
    assert.deepStrictEqual(completedAtLog, [null, 1_234]);
    assert.strictEqual(scheduledCallback, null);
  });

  it('shows updating then done when the refresh outlives the threshold', () => {
    const statusLog = [];
    const completedAtLog = [];
    let scheduledCallback = null;

    const controller = createPreviewUpdateFeedbackController({
      setUpdateStatus: (value) => {
        statusLog.push(typeof value === 'function' ? value(statusLog.at(-1) ?? 'idle') : value);
      },
      setLastCompletedAt: (value) => {
        completedAtLog.push(value);
      },
      now: () => 9_876,
      schedule: (callback) => {
        scheduledCallback = callback;
        return 1;
      },
      clearScheduled: () => {
        scheduledCallback = null;
      }
    });

    controller.handlePreviewUpdating();
    assert.ok(typeof scheduledCallback === 'function', 'threshold callback should be scheduled');

    scheduledCallback();
    controller.handlePreviewComplete();

    assert.deepStrictEqual(statusLog, ['updating', 'done']);
    assert.deepStrictEqual(completedAtLog, [null, 9_876]);
  });
});
