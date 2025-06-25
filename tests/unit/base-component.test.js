const assert = require('assert');
const { mergeClasses } = require('../../out/renderer/components/BaseComponent');

describe('BaseComponent class name merging', () => {
  it('merges default and custom class names', () => {
    const result = mergeClasses('default', 'custom');
    assert.strictEqual(result, 'default custom');
  });

  it('returns default class when custom is undefined', () => {
    const result = mergeClasses('default');
    assert.strictEqual(result, 'default');
  });
});
