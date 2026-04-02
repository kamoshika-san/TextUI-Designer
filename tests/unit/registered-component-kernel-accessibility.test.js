const assert = require('assert');
const React = require('react');
const {
  wrapWithPreviewJumpShell
} = require('../../out/renderer/registered-component-kernel');

describe('registered component kernel accessibility (T-624 / T-625)', () => {
  it('renders explicit button semantics for keyboard and assistive technology', () => {
    const node = wrapWithPreviewJumpShell(
      'accessibility-test',
      {
        dslPath: '/page/components/0',
        onJumpToDsl: () => {}
      },
      React.createElement('div', null, 'Inner'),
      'Button'
    );

    assert.strictEqual(node.props.role, 'button');
    assert.strictEqual(node.props.tabIndex, 0);
    assert.match(node.props['aria-label'], /Jump to DSL for Button/);
    assert.strictEqual(typeof node.props.onKeyDown, 'function');
  });

  it('triggers jump on Enter keydown', () => {
    const calls = [];
    const node = wrapWithPreviewJumpShell(
      'keyboard-jump-test',
      {
        dslPath: '/page/components/4',
        onJumpToDsl: (dslPath, componentName) => {
          calls.push({ dslPath, componentName });
        }
      },
      React.createElement('div', null, 'Inner'),
      'Alert'
    );

    let prevented = false;
    let stopped = false;
    node.props.onKeyDown({
      key: 'Enter',
      preventDefault: () => {
        prevented = true;
      },
      stopPropagation: () => {
        stopped = true;
      }
    });

    assert.strictEqual(prevented, true);
    assert.strictEqual(stopped, true);
    assert.deepStrictEqual(calls, [
      { dslPath: '/page/components/4', componentName: 'Alert' }
    ]);
  });
});
