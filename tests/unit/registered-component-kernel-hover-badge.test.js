const assert = require('assert');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const {
  wrapWithPreviewJumpShell
} = require('../../out/renderer/registered-component-kernel');

describe('registered component kernel hover badge (T-615)', () => {
  it('renders a compact jump badge with component identity inside the preview shell', () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        React.Fragment,
        null,
        wrapWithPreviewJumpShell(
          'badge-test',
          {
            dslPath: '/page/components/0',
            onJumpToDsl: () => {}
          },
          React.createElement('div', { className: 'inner-node' }, 'Inner'),
          'Button'
        )
      )
    );

    assert.match(markup, /textui-jump-target/);
    assert.match(markup, /textui-jump-badge/);
    assert.match(markup, />Button</);
    assert.match(markup, />DSL</);
  });
});
