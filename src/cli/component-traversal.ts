import { BUILT_IN_COMPONENTS } from '../registry/component-registry';

export interface TraversedComponentEntry {
  type: string;
  props: Record<string, unknown>;
  path: string;
}

type ChildTraverser = (props: Record<string, unknown>, basePath: string, entries: TraversedComponentEntry[]) => void;

const BUILT_IN_COMPONENT_SET = new Set<string>(BUILT_IN_COMPONENTS);

const COMPONENT_CHILD_TRAVERSERS: Partial<Record<string, ChildTraverser>> = {
  Container: (props, basePath, entries) => {
    collectFromComponentArray(props.components, `${basePath}/components`, entries);
  },
  Form: (props, basePath, entries) => {
    collectFromComponentArray(props.fields, `${basePath}/fields`, entries);
    collectFromComponentArray(props.actions, `${basePath}/actions`, entries);
  },
  Tabs: (props, basePath, entries) => {
    collectFromItemsComponents(props.items, `${basePath}/items`, entries);
  },
  Accordion: (props, basePath, entries) => {
    collectFromItemsComponents(props.items, `${basePath}/items`, entries);
  },
  TreeView: (props, basePath, entries) => {
    collectFromTreeViewItems(props.items, `${basePath}/items`, entries);
  }
};

export function collectComponentEntries(dsl: unknown): TraversedComponentEntry[] {
  const entries: TraversedComponentEntry[] = [];
  const root = dsl as { page?: { components?: unknown[] }; components?: unknown[] };
  collectFromComponentArray(root.page?.components, '/page/components', entries);
  collectFromComponentArray(root.components, '/components', entries);
  return entries;
}

function collectFromComponentArray(values: unknown, basePath: string, entries: TraversedComponentEntry[]): void {
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
    if (!type || !BUILT_IN_COMPONENT_SET.has(type)) {
      return;
    }

    const props = componentDef[type];
    if (!props || typeof props !== 'object' || Array.isArray(props)) {
      return;
    }

    const componentPath = `${currentPath}/${type}`;
    const propsRecord = props as Record<string, unknown>;
    entries.push({ type, props: propsRecord, path: componentPath });

    const childTraverser = COMPONENT_CHILD_TRAVERSERS[type];
    if (childTraverser) {
      childTraverser(propsRecord, componentPath, entries);
    }
  });
}

function collectFromItemsComponents(values: unknown, basePath: string, entries: TraversedComponentEntry[]): void {
  if (!Array.isArray(values)) {
    return;
  }

  values.forEach((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return;
    }

    const item = value as Record<string, unknown>;
    collectFromComponentArray(item.components, `${basePath}/${index}/components`, entries);
  });
}

function collectFromTreeViewItems(values: unknown, basePath: string, entries: TraversedComponentEntry[]): void {
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
