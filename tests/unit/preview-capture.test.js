const assert = require('assert');

const { expandScrollableContainersForCapture } = require('../../out/utils/preview-capture');

function createElement({ overflow = 'visible', overflowY = 'visible', scrollHeight = 100, clientHeight = 100 } = {}) {
  const calls = [];
  return {
    style: {
      setProperty(name, value, priority) {
        calls.push({ name, value, priority });
      }
    },
    scrollHeight,
    clientHeight,
    __computedStyle: { overflow, overflowY },
    __calls: calls
  };
}

describe('preview-capture expandScrollableContainersForCapture', () => {
  it('expands html/body and only actually scrollable containers', () => {
    const docEl = createElement();
    const body = createElement();
    const scrollable = createElement({ overflowY: 'auto', scrollHeight: 300, clientHeight: 100 });
    const notOverflowing = createElement({ overflowY: 'auto', scrollHeight: 100, clientHeight: 100 });
    const nonScrollable = createElement({ overflowY: 'visible', scrollHeight: 400, clientHeight: 100 });

    const doc = {
      documentElement: docEl,
      body,
      querySelectorAll() {
        return [scrollable, notOverflowing, nonScrollable];
      }
    };

    const win = {
      getComputedStyle(el) {
        return el.__computedStyle;
      }
    };

    expandScrollableContainersForCapture(doc, win);

    const expandedProps = ['overflow', 'overflow-y', 'max-height', 'height'];

    for (const target of [docEl, body, scrollable]) {
      const names = target.__calls.map(c => c.name);
      assert.deepStrictEqual(names, expandedProps);
      assert.ok(target.__calls.every(c => c.priority === 'important'));
    }

    assert.strictEqual(notOverflowing.__calls.length, 0);
    assert.strictEqual(nonScrollable.__calls.length, 0);
  });
});
