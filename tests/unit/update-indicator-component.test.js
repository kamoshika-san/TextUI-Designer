const assert = require('assert');
const path = require('path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

require('ts-node/register/transpile-only');

describe('UpdateIndicator component', () => {
  const { UpdateIndicator } = require(path.resolve(__dirname, '../../src/renderer/components/UpdateIndicator.tsx'));

  it('renders nothing for the idle state', () => {
    const html = renderToStaticMarkup(
      React.createElement(UpdateIndicator, { status: 'idle' })
    );

    assert.strictEqual(html, '');
  });

  it('renders the updating state with the spinner class and label', () => {
    const html = renderToStaticMarkup(
      React.createElement(UpdateIndicator, { status: 'updating' })
    );

    assert.match(html, /textui-update-indicator is-updating/);
    assert.match(html, /textui-update-indicator-spinner/);
    assert.match(html, /Preview updating\.\.\./);
    assert.doesNotMatch(html, /textui-update-indicator-timestamp/);
  });

  it('renders the done state with the checkmark class and label', () => {
    const html = renderToStaticMarkup(
      React.createElement(UpdateIndicator, { status: 'done' })
    );

    assert.match(html, /textui-update-indicator is-done/);
    assert.match(html, /textui-update-indicator-check/);
    assert.match(html, /Updated/);
  });

  it('shows a relative timestamp only when explicitly enabled for a completed update', () => {
    const html = renderToStaticMarkup(
      React.createElement(UpdateIndicator, {
        status: 'done',
        showRelativeTimestamp: true,
        lastCompletedAt: 1_000,
        now: 1_250
      })
    );

    assert.match(html, /textui-update-indicator-timestamp/);
    assert.match(html, /250 ms ago/);
  });
});
