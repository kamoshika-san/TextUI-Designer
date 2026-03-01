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

export const createComponentKeys = (components: ComponentDef[]): string[] =>
  components.map((component, index) => `${hashComponent(component)}-${index}`);

export const mergeDslWithPrevious = (previous: TextUIDSL, next: TextUIDSL): TextUIDSL => {
  const previousComponents = previous.page?.components || [];
  const nextComponents = next.page?.components || [];

  const mergedComponents = nextComponents.map((component, index) => {
    const oldComponent = previousComponents[index];
    if (!oldComponent) {
      return component;
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
