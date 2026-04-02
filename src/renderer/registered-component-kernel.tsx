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

const JUMP_SUCCESS_FLASH_CLASS = 'is-jump-success';
const JUMP_SUCCESS_FLASH_DURATION_MS = 480;

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

export function flashPreviewJumpSuccess(
  element: { classList?: { add(name: string): void; remove(name: string): void } } | undefined,
  scheduleClear: (callback: () => void, delayMs: number) => unknown = setTimeout
): void {
  if (!element?.classList) {
    return;
  }
  element.classList.remove(JUMP_SUCCESS_FLASH_CLASS);
  element.classList.add(JUMP_SUCCESS_FLASH_CLASS);
  scheduleClear(() => {
    element.classList?.remove(JUMP_SUCCESS_FLASH_CLASS);
  }, JUMP_SUCCESS_FLASH_DURATION_MS);
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
  const badgeLabel = componentName ?? 'Component';
  const actionLabel = componentName ?? 'component';
  const jumpTitle =
    `Ctrl+Shift+Click to jump to DSL / Ctrl+Shift+\u30af\u30ea\u30c3\u30af\u3067DSL\u3078\u30b8\u30e3\u30f3\u30d7: ${context.dslPath}`;
  const ariaLabel =
    `Jump to DSL for ${actionLabel} / ${actionLabel} \u306e DSL \u30bd\u30fc\u30b9\u3078\u30b8\u30e3\u30f3\u30d7`;

  const triggerJump = () => {
    if (!context.onJumpToDsl || !componentName) {
      return;
    }
    context.onJumpToDsl(context.dslPath!, componentName);
  };

  return (
    <div
      key={key}
      className="textui-jump-target"
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      title={jumpTitle}
      onClick={(event) => {
        if (!(event.ctrlKey && event.shiftKey)) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        flashPreviewJumpSuccess(event.currentTarget);
        triggerJump();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter') {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        flashPreviewJumpSuccess(event.currentTarget);
        triggerJump();
      }}
    >
      <span className="textui-jump-badge" aria-hidden="true">
        <span className="textui-jump-badge-component">{badgeLabel}</span>
        <span className="textui-jump-badge-link">DSL</span>
      </span>
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
