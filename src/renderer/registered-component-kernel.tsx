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

// flex-row 親の中でコンポーネントが flex アイテムになれるよう、
// inner の style から flex / width 関連プロパティをラッパーへ引き上げる。
// jump-target が間に挟まると flex-grow 等が flex item に効かなくなるため。
const LAYOUT_STYLE_PROPS: ReadonlyArray<keyof React.CSSProperties> = [
  'flexGrow', 'flexShrink', 'flexBasis', 'width', 'minWidth',
];

function hoistLayoutStyle(inner: React.ReactNode): {
  layoutStyle: React.CSSProperties | undefined;
  resolvedInner: React.ReactNode;
} {
  if (!React.isValidElement(inner)) {
    return { layoutStyle: undefined, resolvedInner: inner };
  }
  const innerEl = inner as React.ReactElement<{ style?: React.CSSProperties }>;
  const innerStyle: React.CSSProperties = innerEl.props.style ?? {};
  const extracted: Partial<React.CSSProperties> = {};
  const remaining: React.CSSProperties = { ...innerStyle };
  let hasLayout = false;

  for (const prop of LAYOUT_STYLE_PROPS) {
    if (prop in innerStyle) {
      (extracted as Record<string, unknown>)[prop] = (innerStyle as Record<string, unknown>)[prop];
      delete (remaining as Record<string, unknown>)[prop];
      hasLayout = true;
    }
  }

  if (!hasLayout) {
    return { layoutStyle: undefined, resolvedInner: inner };
  }

  return {
    layoutStyle: extracted as React.CSSProperties,
    resolvedInner: React.cloneElement(innerEl, {
      style: { ...remaining, width: '100%' },
    }),
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
    `Ctrl+Shift+Click to jump to DSL / Ctrl+Shift+クリックでDSLへジャンプ: ${context.dslPath}`;
  const ariaLabel =
    `Jump to DSL for ${actionLabel} / ${actionLabel} の DSL ソースへジャンプ`;

  const { layoutStyle, resolvedInner } = hoistLayoutStyle(inner);

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
      style={layoutStyle}
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
      {resolvedInner}
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
