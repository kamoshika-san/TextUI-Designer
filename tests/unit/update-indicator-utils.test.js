const assert = require('assert');
const path = require('path');

describe('update indicator utils', () => {
  const {
    formatRelativeUpdateTimestamp
  } = require(path.resolve(__dirname, '../../out/renderer/update-indicator-utils.js'));

  it('formats sub-second timestamps in milliseconds', () => {
    assert.strictEqual(formatRelativeUpdateTimestamp(250), '250 ms ago');
  });

  it('formats second-level timestamps compactly', () => {
    assert.strictEqual(formatRelativeUpdateTimestamp(1_400), '1s ago');
  });

  it('formats minute-level timestamps compactly', () => {
    assert.strictEqual(formatRelativeUpdateTimestamp(61_000), '1m ago');
  });
});
