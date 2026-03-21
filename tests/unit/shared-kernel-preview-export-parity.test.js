/**
 * E3-S1-T3: preview shell と export shell が共有する renderSharedRegisteredOutput の
 * DOM 出力が、jump 枠を除き同一であることを保証する（T-195）。
 *
 * 注: Tabs / Accordion 等、子を `renderRegisteredComponent` で再帰するコンポーネントでは
 * プレビュー時のみ子に `textui-jump-target` が付く（意図的）。その差分は共有カーネル parity の
 * 対象外。葉に近いコンポーネント列で __renderContext が DOM に漏れないことを担保する。
 */
const assert = require('assert');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { renderSharedRegisteredOutput } = require('../../out/renderer/registered-component-kernel');
const { renderPageComponentsToStaticHtml } = require('../../out/exporters/react-static-export');
const { createComponentKeys } = require('../../out/renderer/preview-diff');
const { registerBuiltInComponents } = require('../../out/renderer/component-map');

describe('shared kernel: preview vs export inner markup parity (T-195)', () => {
  before(() => {
    registerBuiltInComponents();
  });

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
      React.createElement(React.Fragment, null, ...innerPreview)
    );

    assert.strictEqual(
      markupExport,
      markupPreview,
      '共有カーネルはプレビュー用 __renderContext 付きでも静的エクスポートと同一のマークアップであること'
    );

    const staticHtml = renderPageComponentsToStaticHtml(components);
    const fromSharedOnly = renderToStaticMarkup(
      React.createElement(
        'div',
        { style: { padding: 24 } },
        ...components.map((comp, i) => renderSharedRegisteredOutput(comp, keys[i] ?? i, undefined).node)
      )
    );
    assert.strictEqual(
      staticHtml,
      fromSharedOnly,
      'renderPageComponentsToStaticHtml は共有カーネル出力＋padding div と一致すること'
    );
  }

  it('Text / Button / Badge でプレビュー文脈と undefined の内側マークアップが一致', () => {
    assertSharedKernelParity([
      { Text: { value: 'Hello', variant: 'h2' } },
      { Button: { label: 'Go' } },
      { Badge: { label: 'new', variant: 'primary' } }
    ]);
  });

  it('Alert / Divider など子再帰を持たないコンポーネントでも一致', () => {
    assertSharedKernelParity([
      { Alert: { title: 'Note', message: 'Hello', variant: 'info' } },
      { Divider: {} },
      { Spacer: { height: 8 } }
    ]);
  });
});
