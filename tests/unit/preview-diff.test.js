const assert = require('assert');

const {
  hashString,
  createComponentKeys,
  mergeDslWithPrevious
} = require('../../out/renderer/preview-diff');

describe('PreviewDiff utilities', () => {
  it('hashString returns same hash for same input', () => {
    assert.strictEqual(hashString('abc'), hashString('abc'));
  });

  it('createComponentKeys creates deterministic keys', () => {
    const components = [
      { Text: { value: 'hello' } },
      { Button: { label: 'Submit' } }
    ];

    const first = createComponentKeys(components);
    const second = createComponentKeys(components);

    assert.deepStrictEqual(first, second);
    assert.strictEqual(first.length, 2);
  });

  it('mergeDslWithPrevious preserves reference for unchanged components', () => {
    const oldText = { Text: { value: 'A' } };
    const oldButton = { Button: { label: 'old' } };

    const previous = {
      page: {
        id: 'page',
        title: 'title',
        layout: 'vertical',
        components: [oldText, oldButton]
      }
    };

    const next = {
      page: {
        id: 'page',
        title: 'title',
        layout: 'vertical',
        components: [
          { Text: { value: 'A' } },
          { Button: { label: 'new' } }
        ]
      }
    };

    const merged = mergeDslWithPrevious(previous, next);

    assert.strictEqual(merged.page.components[0], oldText);
    assert.notStrictEqual(merged.page.components[1], oldButton);
    assert.strictEqual(merged.page.components[1].Button.label, 'new');
  });

  it('mergeDslWithPrevious returns previous instance when no changes exist', () => {
    const previous = {
      page: {
        id: 'page',
        title: 'title',
        layout: 'vertical',
        components: [{ Text: { value: 'A' } }]
      }
    };

    const next = {
      page: {
        id: 'page',
        title: 'title',
        layout: 'vertical',
        components: [{ Text: { value: 'A' } }]
      }
    };

    const merged = mergeDslWithPrevious(previous, next);
    assert.strictEqual(merged, previous);
  });
});
