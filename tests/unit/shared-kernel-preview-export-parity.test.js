/**
 * E3-S1-T3: preview shell と export shell が共有する renderSharedRegisteredOutput の
 * DOM 出力を、jump wrapper を除いて同一であることを検証する (T-195)。
 *
 * 注: Tabs / Accordion などを renderRegisteredComponent で再帰するコンポーネントでは
 * プレビュー時のみ textui-jump-target が付く。共有カーネル parity の比較では
 * __renderContext 由来の wrapper 差分を除き、inner markup が同一であることを見る。
 *
 * T-005 正本: docs/current/runtime-boundaries/react-shared-kernel-preview-export.md
 * （react-ssot-check で保証する範囲 / しない範囲の説明）
 */
const assert = require('assert');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { renderSharedRegisteredOutput } = require('../../out/renderer/registered-component-kernel');
const { renderPageComponentsToStaticHtml } = require('../../out/exporters/react-static-export');
const { createComponentKeys } = require('../../out/renderer/preview-diff');
const { registerBuiltInComponents } = require('../../out/renderer/component-map');
const { PreviewShellCore } = require('../../out/shared/preview-shell');

describe('shared kernel: preview vs export inner markup parity (T-195)', () => {
  before(() => {
    registerBuiltInComponents();
  });

  function stripPreviewJumpTargets(node) {
    if (Array.isArray(node)) {
      return node.map(stripPreviewJumpTargets);
    }

    if (!React.isValidElement(node)) {
      return node;
    }

    const { className, children, ...restProps } = node.props || {};
    const normalizedChildren = React.Children.map(children, stripPreviewJumpTargets);

    if (className === 'textui-jump-target') {
      return normalizedChildren;
    }

    if (className === 'textui-jump-badge') {
      return null;
    }

    return React.cloneElement(node, restProps, normalizedChildren);
  }

  function assertSharedKernelParity(components) {
    const keys = createComponentKeys(components);
    const previewContext = (i) => ({
      dslPath: `/page/components/${i}`,
      onJumpToDsl: () => {}
    });

    const innerExport = components.map((comp, i) =>
      renderSharedRegisteredOutput(comp, keys[i] ?? i, undefined).node
    );
    const innerPreview = components.map((comp, i) =>
      renderSharedRegisteredOutput(comp, keys[i] ?? i, previewContext(i)).node
    );

    const markupExport = renderToStaticMarkup(
      React.createElement(React.Fragment, null, ...innerExport)
    );
    const markupPreview = renderToStaticMarkup(
      React.createElement(
        React.Fragment,
        null,
        ...innerPreview.map(stripPreviewJumpTargets)
      )
    );

    assert.strictEqual(
      markupExport,
      markupPreview,
      'shared kernel inner markup must stay identical between preview and export when jump wrappers are excluded'
    );

    const staticHtml = renderPageComponentsToStaticHtml(components);
    const fromSharedOnly = renderToStaticMarkup(
      React.createElement(
        PreviewShellCore,
        null,
        ...components.map((comp, i) => renderSharedRegisteredOutput(comp, keys[i] ?? i, undefined).node)
      )
    );
    assert.strictEqual(
      staticHtml,
      fromSharedOnly,
      'renderPageComponentsToStaticHtml must remain a thin wrapper around the shared kernel output'
    );
  }

  it('keeps parity for simple text, button, and badge components', () => {
    assertSharedKernelParity([
      { Text: { value: 'Hello', variant: 'h2' } },
      { Button: { label: 'Go' } },
      { Badge: { label: 'new', variant: 'primary' } }
    ]);
  });

  it('keeps parity for alert, divider, and spacer components', () => {
    assertSharedKernelParity([
      { Alert: { title: 'Note', message: 'Hello', variant: 'info' } },
      { Divider: {} },
      { Spacer: { height: 8 } }
    ]);
  });

  it('keeps parity for Button / Alert / Form / Layout representative cases for Epic C safety net', () => {
    assertSharedKernelParity([
      {
        Button: {
          label: 'Save changes',
          kind: 'primary',
          icon: 'check',
          iconPosition: 'left',
          size: 'lg'
        }
      },
      {
        Alert: {
          title: 'Heads up',
          message: 'Preview and export should keep the same alert structure.',
          variant: 'warning'
        }
      },
      {
        Form: {
          id: 'react-ssot-form',
          fields: [
            { Input: { name: 'email', label: 'Email', placeholder: 'user@example.com' } },
            { Checkbox: { name: 'agree', label: 'Agree to terms' } }
          ],
          actions: [
            { Button: { label: 'Submit', submit: true, kind: 'submit' } },
            { Button: { label: 'Cancel', kind: 'secondary' } }
          ]
        }
      },
      {
        Container: {
          layout: 'horizontal',
          width: '100%',
          components: [
            { Text: { value: 'Left pane', variant: 'h3' } },
            { Badge: { label: 'beta', variant: 'secondary' } }
          ]
        }
      }
    ]);
  });

  it('keeps parity for nested layout structures across preview and export', () => {
    assertSharedKernelParity([
      {
        Container: {
          layout: 'grid',
          token: '#f5f5f5',
          components: [
            {
              Alert: {
                title: 'Grid item 1',
                message: 'Alert inside a layout container',
                variant: 'success'
              }
            },
            {
              Container: {
                layout: 'vertical',
                minWidth: '240px',
                components: [
                  { Button: { label: 'Nested action', kind: 'secondary' } },
                  { Text: { value: 'Nested text body' } }
                ]
              }
            }
          ]
        }
      }
    ]);
  });
});
