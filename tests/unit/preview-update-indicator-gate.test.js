const assert = require('assert');
const path = require('path');

describe('preview update indicator gate', () => {
  const gate = require(path.resolve(__dirname, '../../out/renderer/preview-update-indicator-gate.js'));

  it('keeps the indicator hidden while the threshold is still pending', () => {
    const pending = gate.beginPreviewUpdateIndicatorGate();
    const completed = gate.completePreviewUpdateIndicatorGate(pending);

    assert.deepStrictEqual(completed.gate, gate.INITIAL_PREVIEW_UPDATE_INDICATOR_GATE_STATE);
    assert.strictEqual(completed.status, 'idle');
  });

  it('shows updating after the threshold elapses and returns done on completion', () => {
    const pending = gate.beginPreviewUpdateIndicatorGate();
    const revealed = gate.revealPreviewUpdateIndicator(pending);
    const completed = gate.completePreviewUpdateIndicatorGate(revealed.gate);

    assert.strictEqual(revealed.status, 'updating');
    assert.strictEqual(completed.status, 'done');
  });

  it('resets to idle on aborts', () => {
    const aborted = gate.abortPreviewUpdateIndicatorGate();

    assert.deepStrictEqual(aborted.gate, gate.INITIAL_PREVIEW_UPDATE_INDICATOR_GATE_STATE);
    assert.strictEqual(aborted.status, 'idle');
  });
});
