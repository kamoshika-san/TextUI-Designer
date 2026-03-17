import type { ComponentDef, TextUIDSL } from './types';

export const hashString = (value: string): string => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
};

export const hashComponent = (component: ComponentDef): string => hashString(JSON.stringify(component));

/**
 * コンポーネント配列から安定した key 配列を生成する。
 * previousComponents / previousKeys を渡すと、同じ参照の要素は前回の key を再利用し stringify を省略する（T-20260317-006）。
 */
export const createComponentKeys = (
  components: ComponentDef[],
  previousComponents?: ComponentDef[] | null,
  previousKeys?: string[] | null
): string[] =>
  components.map((component, index) => {
    if (previousComponents && previousKeys && index < previousComponents.length && index < previousKeys.length) {
      if (component === previousComponents[index]) {
        return previousKeys[index];
      }
    }
    return `${hashComponent(component)}-${index}`;
  });

/**
 * 前回DSLと次DSLをマージし、参照が同じコンポーネントは維持して React の再描画を抑える。
 * 参照が同じ場合は JSON.stringify をスキップしてコスト削減（T-20260317-006）。
 */
export const mergeDslWithPrevious = (previous: TextUIDSL, next: TextUIDSL): TextUIDSL => {
  const previousComponents = previous.page?.components || [];
  const nextComponents = next.page?.components || [];

  const mergedComponents = nextComponents.map((component, index) => {
    const oldComponent = previousComponents[index];
    if (!oldComponent) {
      return component;
    }
    // 参照同一なら stringify スキップ（T-20260317-006）
    if (oldComponent === component) {
      return oldComponent;
    }
    return JSON.stringify(oldComponent) === JSON.stringify(component) ? oldComponent : component;
  });

  if (
    mergedComponents.length === previousComponents.length &&
    mergedComponents.every((component, index) => component === previousComponents[index])
  ) {
    return previous;
  }

  return {
    ...next,
    page: {
      ...next.page,
      components: mergedComponents
    }
  };
};
