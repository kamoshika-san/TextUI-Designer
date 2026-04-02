const assert = require('assert');
const path = require('path');

describe('preview update status reducer', () => {
  const {
    reducePreviewUpdateStatus
  } = require(path.resolve(__dirname, '../../out/renderer/preview-update-status.js'));

  it('moves into updating when preview refresh starts', () => {
    assert.strictEqual(
      reducePreviewUpdateStatus('idle', 'preview-updating'),
      'updating'
    );
  });

  it('moves into done when preview refresh completes', () => {
    assert.strictEqual(
      reducePreviewUpdateStatus('updating', 'preview-update-complete'),
      'done'
    );
  });

  it('returns to idle on preview update errors', () => {
    assert.strictEqual(
      reducePreviewUpdateStatus('done', 'preview-update-error'),
      'idle'
    );
  });
});
