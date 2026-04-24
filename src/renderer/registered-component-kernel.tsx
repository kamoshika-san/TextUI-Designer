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
// inner の flex / width 関連プロパティをラッパーへ引き上げる。
// jump-target が間に挟まると flex-grow 等が flex item に効かなくなるため。
//
// inner が DOM 要素（style prop あり）の場合と、React コンポーネント要素
// （flexGrow/width/minWidth を直接 props に持つ Container 等）の場合を両方処理する。

function hoistLayoutStyle(inner: React.ReactNode): {
  layoutStyle: React.CSSProperties | undefined;
  resolvedInner: React.ReactNode;
} {
  if (!React.isValidElement(inner)) {
    return { layoutStyle: undefined, resolvedInner: inner };
  }

  const innerEl = inner as React.ReactElement<{
    style?: React.CSSProperties;
    flexGrow?: number;
    width?: string;
    minWidth?: string;
  }>;
  const p = innerEl.props;

  // Path A: DOM element — flex styles already computed in a `style` prop
  const innerStyle: React.CSSProperties = p.style ?? {};
  const STYLE_KEYS: ReadonlyArray<keyof React.CSSProperties> = [
    'flexGrow', 'flexShrink', 'flexBasis', 'width', 'minWidth',
  ];
  const hasStyleLayout = STYLE_KEYS.some(k => k in innerStyle);
  if (hasStyleLayout) {
    const extracted: Partial<React.CSSProperties> = {};
    const remaining: React.CSSProperties = { ...innerStyle };
    for (const k of STYLE_KEYS) {
      if (k in innerStyle) {
        (extracted as Record<string, unknown>)[k] = (innerStyle as Record<string, unknown>)[k];
        delete (remaining as Record<string, unknown>)[k];
      }
    }
    return {
      layoutStyle: extracted as React.CSSProperties,
      resolvedInner: React.cloneElement(innerEl, { style: { ...remaining, width: '100%' } }),
    };
  }

  // Path B: React component element (e.g. Container) — flex layout expressed as component props
  const { flexGrow, width, minWidth } = p;
  if (typeof flexGrow === 'number') {
    const layoutStyle: React.CSSProperties = {
      flexGrow,
      flexShrink: flexGrow > 0 && width === '0' ? 1 : 0,
      flexBasis: width ?? 0,
      minWidth: minWidth ?? 0,
      ...(width && width !== '0' ? { width } : {}),
    };
    // Override width to 100% so the component fills the wrapper after flex distributes space
    return {
      layoutStyle,
      resolvedInner: React.cloneElement(innerEl, { style: { width: '100%' } }),
    };
  }

  if (width || minWidth) {
    const layoutStyle: React.CSSProperties = {
      ...(width ? { width } : {}),
      ...(minWidth ? { minWidth } : {}),
    };
    return {
      layoutStyle,
      resolvedInner: React.cloneElement(innerEl, { style: { width: '100%' } }),
    };
  }

  return { layoutStyle: undefined, resolvedInner: inner };
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
