const assert = require('assert');
const {
  flashPreviewJumpSuccess
} = require('../../out/renderer/registered-component-kernel');

describe('registered component kernel success flash (T-623)', () => {
  it('adds and later removes the success flash class from the jump target', () => {
    const calls = [];
    const classNames = new Set();
    const element = {
      classList: {
        add(name) {
          classNames.add(name);
          calls.push(`add:${name}`);
        },
        remove(name) {
          classNames.delete(name);
          calls.push(`remove:${name}`);
        }
      }
    };

    let scheduled;
    flashPreviewJumpSuccess(element, (callback) => {
      scheduled = callback;
      return 1;
    });

    assert.deepStrictEqual(calls.slice(0, 2), [
      'remove:is-jump-success',
      'add:is-jump-success'
    ]);
    assert.strictEqual(classNames.has('is-jump-success'), true);

    scheduled();

    assert.strictEqual(classNames.has('is-jump-success'), false);
    assert.strictEqual(calls[calls.length - 1], 'remove:is-jump-success');
  });
});
