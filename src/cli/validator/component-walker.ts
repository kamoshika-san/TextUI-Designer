import { BUILT_IN_COMPONENTS } from '../../registry/component-manifest';

export interface ComponentEntry {
  type: string;
  props: Record<string, unknown>;
  path: string;
}

const KNOWN_COMPONENTS = new Set<string>(BUILT_IN_COMPONENTS);

export function collectComponentEntries(dsl: unknown): ComponentEntry[] {
  const entries: ComponentEntry[] = [];
  const root = dsl as { page?: { components?: unknown[] }; components?: unknown[] };
  collectFromComponentArray(root.page?.components, '/page/components', entries);
  collectFromComponentArray(root.components, '/components', entries);
  return entries;
}

function collectFromComponentArray(values: unknown, basePath: string, entries: ComponentEntry[]): void {
  if (!Array.isArray(values)) {
    return;
  }

  values.forEach((value, index) => {
    const currentPath = `${basePath}/${index}`;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return;
    }

    const componentDef = value as Record<string, unknown>;
    const [type] = Object.keys(componentDef);
    if (!type || !KNOWN_COMPONENTS.has(type)) {
      return;
    }

    const props = componentDef[type];
    if (!props || typeof props !== 'object' || Array.isArray(props)) {
      return;
    }

    const componentPath = `${currentPath}/${type}`;
    const propsRecord = props as Record<string, unknown>;
    entries.push({ type, props: propsRecord, path: componentPath });

    if (type === 'Container') {
      collectFromComponentArray(propsRecord.components, `${componentPath}/components`, entries);
      return;
    }

    if (type === 'Form') {
      collectFromComponentArray(propsRecord.fields, `${componentPath}/fields`, entries);
      collectFromComponentArray(propsRecord.actions, `${componentPath}/actions`, entries);
      return;
    }

    if (type === 'Tabs') {
      const items = propsRecord.items;
      if (!Array.isArray(items)) {
        return;
      }

      items.forEach((item, itemIndex) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return;
        }
        const itemComponents = (item as Record<string, unknown>).components;
        collectFromComponentArray(itemComponents, `${componentPath}/items/${itemIndex}/components`, entries);
      });
      return;
    }

    if (type === 'Accordion') {
      const items = propsRecord.items;
      if (!Array.isArray(items)) {
        return;
      }

      items.forEach((item, itemIndex) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return;
        }
        const itemComponents = (item as Record<string, unknown>).components;
        collectFromComponentArray(itemComponents, `${componentPath}/items/${itemIndex}/components`, entries);
      });
      return;
    }

    if (type === 'TreeView') {
      collectFromTreeViewItems(propsRecord.items, `${componentPath}/items`, entries);
    }
  });
}

function collectFromTreeViewItems(values: unknown, basePath: string, entries: ComponentEntry[]): void {
  if (!Array.isArray(values)) {
    return;
  }

  values.forEach((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return;
    }

    const item = value as Record<string, unknown>;
    collectFromComponentArray(item.components, `${basePath}/${index}/components`, entries);
    collectFromTreeViewItems(item.children, `${basePath}/${index}/children`, entries);
  });
}
