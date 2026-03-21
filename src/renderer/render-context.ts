/**
 * WebView / 静的 HTML 共有のレンダリング文脈。
 * プレビュー専用の jump-to-DSL は `dslPath` と `onJumpToDsl` の両方があるときのみ有効（T-193/T-194）。
 */
export interface RenderContext {
  dslPath?: string;
  onJumpToDsl?: (dslPath: string, componentName: string) => void;
}

export function attachRenderContext(
  props: Record<string, unknown>,
  context?: RenderContext
): Record<string, unknown> {
  if (!context) {
    return props;
  }
  return {
    ...props,
    __renderContext: context
  };
}

export function extractRenderContext(props: unknown): RenderContext | undefined {
  if (!props || typeof props !== 'object') {
    return undefined;
  }
  const value = (props as Record<string, unknown>).__renderContext;
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const dslPath = (value as Record<string, unknown>).dslPath;
  if (typeof dslPath !== 'string') {
    return undefined;
  }
  const onJumpToDsl = (value as Record<string, unknown>).onJumpToDsl;
  return {
    dslPath,
    onJumpToDsl: typeof onJumpToDsl === 'function'
      ? (onJumpToDsl as (dslPath: string, componentName: string) => void)
      : undefined
  };
}

export function createChildContext(
  parent: RenderContext | undefined,
  childPath: string
): RenderContext | undefined {
  if (!parent) {
    return undefined;
  }
  return {
    dslPath: childPath,
    onJumpToDsl: parent.onJumpToDsl
  };
}
