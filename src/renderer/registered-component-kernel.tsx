/**
 * renderRegisteredComponent の共有カーネル + プレビュー専用ラッパー（T-193）。
 * - 共有: DSL 解決 → レンダラーまたは Unsupported
 * - プレビュー: jump-to-DSL 用の div（`dslPath` と `onJumpToDsl` がそろうときのみ）
 */
import React from 'react';
import type { ComponentDef } from '../domain/dsl-types';
import { decodeDslComponentObjectProps } from '../registry/dsl-component-codec';
import { UnsupportedComponent } from './components/UnsupportedComponent';
import { getWebViewComponentRenderer } from '../registry/webview-component-registry';
import type { RenderContext } from './render-context';
import { attachRenderContext } from './render-context';

function resolveWebViewRenderer(name: string | undefined) {
  if (!name) {
    return undefined;
  }
  return getWebViewComponentRenderer(name);
}

/** プレビューで Ctrl+Shift ジャンプが有効になる条件。静的 HTML では通常 false（T-194）。 */
export function isPreviewJumpInteractive(context?: RenderContext): boolean {
  return Boolean(context?.dslPath && context?.onJumpToDsl);
}

/**
 * 共有レンダリング（jump ラッパーなし）。`resolvedName` は jump ハンドラ用。
 */
export function renderSharedRegisteredOutput(
  comp: ComponentDef,
  key: React.Key,
  context: RenderContext | undefined
): { node: React.ReactNode; resolvedName: string | undefined } {
  const decoded = decodeDslComponentObjectProps(comp);
  const name = decoded.value?.name;
  const props = decoded.value?.props;
  const renderer = resolveWebViewRenderer(name);

  if (name && props && renderer) {
    return {
      node: renderer(attachRenderContext(props, context), key),
      resolvedName: name
    };
  }

  return {
    node: <UnsupportedComponent componentName={name ?? 'Unknown'} props={props} />,
    resolvedName: name
  };
}

/**
 * インタラクティブプレビュー用: jump-to-DSL のラッパー div。
 */
export function wrapWithPreviewJumpShell(
  key: React.Key,
  context: RenderContext,
  inner: React.ReactNode,
  componentName: string | undefined
): React.ReactNode {
  return (
    <div
      key={key}
      className="textui-jump-target"
      title={`Ctrl+Shift+クリックでDSLへジャンプ: ${context.dslPath}`}
      onClick={(event) => {
        if (!context.onJumpToDsl || !componentName) {
          return;
        }
        if (!(event.ctrlKey && event.shiftKey)) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        context.onJumpToDsl(context.dslPath!, componentName);
      }}
    >
      {inner}
    </div>
  );
}

/**
 * カーネル合成: 共有出力 + 条件付きプレビュー枠。
 */
export function composeRegisteredComponent(
  comp: ComponentDef,
  key: React.Key,
  context: RenderContext | undefined
): React.ReactNode {
  const { node, resolvedName } = renderSharedRegisteredOutput(comp, key, context);

  if (!isPreviewJumpInteractive(context)) {
    return <React.Fragment key={key}>{node}</React.Fragment>;
  }

  return wrapWithPreviewJumpShell(key, context!, node, resolvedName);
}
