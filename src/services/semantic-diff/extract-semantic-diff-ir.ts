import { isComponentDefValue, type ComponentDef, type TextUIDSL } from '../../domain/dsl-types';
import type {
  SemanticDiffIRNode,
  SemanticDiffIRRoot,
  SemanticDiffIRScreen,
  SemanticDiffIRValue
} from '../../types/semantic-diff';

export interface BuildSemanticDiffIROptions {
  documentPath?: string;
}

type SurfaceName = 'props' | 'layout' | 'style' | 'events' | 'bindings' | 'conditions';

type Surfaces = {
  props: Record<string, SemanticDiffIRValue>;
  layout: Record<string, SemanticDiffIRValue>;
  style: Record<string, SemanticDiffIRValue>;
  events: Record<string, SemanticDiffIRValue>;
  bindings: Record<string, SemanticDiffIRValue>;
  conditions: Record<string, SemanticDiffIRValue>;
};

interface ExtractionContext {
  screenKey: string;
  documentPath?: string;
}

interface ChildSpec {
  component: ComponentDef;
  entityPath: string;
  ownerPath: string;
  slotName?: string;
}

const RESERVED_SURFACE_KEYS = new Set<SurfaceName>([
  'props',
  'layout',
  'style',
  'events',
  'bindings',
  'conditions'
]);

const CHILD_COLLECTION_KEYS = new Set([
  'components',
  'fields',
  'actions',
  'items',
  'children',
  'rows'
]);

const LAYOUT_KEYS = new Set([
  'layout',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'flexGrow',
  'flexBasis',
  'padding',
  'margin',
  'gap',
  'align',
  'justify'
]);

const STYLE_KEYS = new Set([
  'token',
  'tokenSlots',
  'color',
  'variant',
  'size',
  'weight',
  'icon',
  'iconPosition'
]);

const CONDITION_KEYS = new Set(['visibleWhen', 'enabledWhen', 'disabledWhen']);

const BINDING_KEYS = new Set(['binding', 'bindings', 'source', 'query', 'dataSource']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asComparableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => asComparableValue(item));
  }

  if (isComponentDefValue(value)) {
    const [kind, props] = Object.entries(value)[0] as [string, unknown];
    return {
      componentKind: kind,
      props: asComparableValue(props)
    };
  }

  if (isRecord(value)) {
    const sortedEntries = Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, asComparableValue(nested)] as const);
    return Object.fromEntries(sortedEntries);
  }

  return value;
}

function expandBoxShorthand(value: unknown): unknown {
  if (typeof value === 'number' || typeof value === 'string') {
    return {
      top: value,
      right: value,
      bottom: value,
      left: value
    };
  }

  if (!isRecord(value)) {
    return value;
  }

  const top = value.top;
  const right = value.right ?? top;
  const bottom = value.bottom ?? top;
  const left = value.left ?? right ?? top;

  return {
    top,
    right,
    bottom,
    left
  };
}

function normalizeSurfaceValue(key: string, value: unknown): unknown {
  if (key === 'padding' || key === 'margin') {
    return expandBoxShorthand(value);
  }

  return asComparableValue(value);
}

function makeExplicitValue(value: unknown, entityPath: string, documentPath?: string): SemanticDiffIRValue {
  return {
    value,
    explicitness: 'explicit',
    sourceRef: {
      documentPath,
      entityPath
    }
  };
}

function makeDerivedDefaultValue(value: unknown, entityPath: string, documentPath?: string): SemanticDiffIRValue {
  return {
    value,
    explicitness: 'derived-default',
    sourceRef: {
      documentPath,
      entityPath
    }
  };
}

function sortSurface(surface: Record<string, SemanticDiffIRValue>): Record<string, SemanticDiffIRValue> {
  return Object.fromEntries(
    Object.entries(surface).sort(([left], [right]) => left.localeCompare(right))
  );
}

function unwrapComponent(component: ComponentDef): [string, Record<string, unknown>] {
  const [kind, props] = Object.entries(component)[0] as [string, unknown];
  return [kind, isRecord(props) ? props : {}];
}

function classifySurface(key: string): SurfaceName {
  if (/^on[A-Z]/.test(key)) {
    return 'events';
  }

  if (CONDITION_KEYS.has(key)) {
    return 'conditions';
  }

  if (BINDING_KEYS.has(key)) {
    return 'bindings';
  }

  if (LAYOUT_KEYS.has(key)) {
    return 'layout';
  }

  if (STYLE_KEYS.has(key)) {
    return 'style';
  }

  return 'props';
}

function applySurfaceBag(
  target: Record<string, SemanticDiffIRValue>,
  bag: Record<string, unknown>,
  entityPath: string,
  documentPath?: string
): void {
  for (const [key, value] of Object.entries(bag)) {
    target[key] = makeExplicitValue(
      normalizeSurfaceValue(key, value),
      `${entityPath}/${key}`,
      documentPath
    );
  }
}

function addDerivedDefaults(
  kind: string,
  props: Record<string, unknown>,
  surfaces: Surfaces,
  entityPath: string,
  documentPath?: string
): void {
  if ((kind === 'Input' || kind === 'DatePicker') && !('required' in props) && !('required' in surfaces.props)) {
    surfaces.props.required = makeDerivedDefaultValue(false, `${entityPath}/required`, documentPath);
  }
}

function buildSurfaces(kind: string, props: Record<string, unknown>, entityPath: string, documentPath?: string): Surfaces {
  const surfaces: Surfaces = {
    props: {},
    layout: {},
    style: {},
    events: {},
    bindings: {},
    conditions: {}
  };

  for (const surfaceName of RESERVED_SURFACE_KEYS) {
    const bag = props[surfaceName];
    if (isRecord(bag)) {
      applySurfaceBag(surfaces[surfaceName], bag, `${entityPath}/${surfaceName}`, documentPath);
    }
  }

  for (const [key, value] of Object.entries(props)) {
    if (RESERVED_SURFACE_KEYS.has(key as SurfaceName) || CHILD_COLLECTION_KEYS.has(key)) {
      continue;
    }

    if (Array.isArray(value) && value.every(item => isComponentDefValue(item))) {
      continue;
    }

    const surfaceName = classifySurface(key);
    surfaces[surfaceName][key] = makeExplicitValue(
      normalizeSurfaceValue(key, value),
      `${entityPath}/${key}`,
      documentPath
    );
  }

  addDerivedDefaults(kind, props, surfaces, entityPath, documentPath);

  return {
    props: sortSurface(surfaces.props),
    layout: sortSurface(surfaces.layout),
    style: sortSurface(surfaces.style),
    events: sortSurface(surfaces.events),
    bindings: sortSurface(surfaces.bindings),
    conditions: sortSurface(surfaces.conditions)
  };
}

function extractChildrenFromItems(
  items: unknown[],
  entityPath: string,
  slotName: string
): ChildSpec[] {
  const children: ChildSpec[] = [];

  items.forEach((item, itemIndex) => {
    if (!isRecord(item)) {
      return;
    }

    const itemPath = `${entityPath}/items/${itemIndex}`;

    const nestedComponents = item.components;
    if (Array.isArray(nestedComponents)) {
      nestedComponents.forEach((component, componentIndex) => {
        if (!isComponentDefValue(component)) {
          return;
        }

        children.push({
          component,
          entityPath: `${itemPath}/components/${componentIndex}`,
          ownerPath: `${itemPath}/components`,
          slotName
        });
      });
    }

    const nestedChildren = item.children;
    if (Array.isArray(nestedChildren)) {
      children.push(...extractChildrenFromItems(nestedChildren, itemPath, slotName));
    }
  });

  return children;
}

function extractChildSpecs(props: Record<string, unknown>, entityPath: string): ChildSpec[] {
  const children: ChildSpec[] = [];

  const components = props.components;
  if (Array.isArray(components)) {
    components.forEach((component, index) => {
      if (!isComponentDefValue(component)) {
        return;
      }

      children.push({
        component,
        entityPath: `${entityPath}/components/${index}`,
        ownerPath: `${entityPath}/components`,
        slotName: 'components'
      });
    });
  }

  const fields = props.fields;
  if (Array.isArray(fields)) {
    fields.forEach((field, index) => {
      if (!isRecord(field)) {
        return;
      }

      Object.entries(field).forEach(([kind, value]) => {
        const component = { [kind]: value } as ComponentDef;
        if (!isComponentDefValue(component)) {
          return;
        }

        children.push({
          component,
          entityPath: `${entityPath}/fields/${index}`,
          ownerPath: `${entityPath}/fields`,
          slotName: 'fields'
        });
      });
    });
  }

  const actions = props.actions;
  if (Array.isArray(actions)) {
    actions.forEach((action, index) => {
      if (!isRecord(action)) {
        return;
      }

      Object.entries(action).forEach(([kind, value]) => {
        const component = { [kind]: value } as ComponentDef;
        if (!isComponentDefValue(component)) {
          return;
        }

        children.push({
          component,
          entityPath: `${entityPath}/actions/${index}`,
          ownerPath: `${entityPath}/actions`,
          slotName: 'actions'
        });
      });
    });
  }

  const items = props.items;
  if (Array.isArray(items)) {
    children.push(...extractChildrenFromItems(items, entityPath, 'items'));
  }

  const rows = props.rows;
  if (Array.isArray(rows)) {
    rows.forEach((row, rowIndex) => {
      if (!isRecord(row)) {
        return;
      }

      Object.entries(row).forEach(([columnKey, cellValue]) => {
        if (!isComponentDefValue(cellValue)) {
          return;
        }

        children.push({
          component: cellValue,
          entityPath: `${entityPath}/rows/${rowIndex}/${columnKey}`,
          ownerPath: `${entityPath}/rows/${rowIndex}`,
          slotName: 'rows'
        });
      });
    });
  }

  return children;
}

function buildNode(component: ComponentDef, spec: ChildSpec, context: ExtractionContext): SemanticDiffIRNode {
  const [componentKind, props] = unwrapComponent(component);
  const stableId = typeof props.id === 'string' && props.id.length > 0 ? props.id : undefined;
  const surfaces = buildSurfaces(componentKind, props, spec.entityPath, context.documentPath);
  const children = extractChildSpecs(props, spec.entityPath).map(child =>
    buildNode(child.component, child, context)
  );

  return {
    nodeId: stableId
      ? `stable:${context.screenKey}:${componentKind}:${stableId}`
      : `path:${context.screenKey}:${spec.entityPath}`,
    componentKind,
    stableId,
    screenKey: context.screenKey,
    ownerPath: spec.ownerPath,
    slotName: spec.slotName,
    sourceRef: {
      documentPath: context.documentPath,
      entityPath: spec.entityPath
    },
    props: surfaces.props,
    layout: Object.keys(surfaces.layout).length > 0 ? surfaces.layout : undefined,
    style: Object.keys(surfaces.style).length > 0 ? surfaces.style : undefined,
    events: Object.keys(surfaces.events).length > 0 ? surfaces.events : undefined,
    bindings: Object.keys(surfaces.bindings).length > 0 ? surfaces.bindings : undefined,
    conditions: Object.keys(surfaces.conditions).length > 0 ? surfaces.conditions : undefined,
    children
  };
}

function buildScreen(dsl: TextUIDSL, options: BuildSemanticDiffIROptions): SemanticDiffIRScreen {
  const page = dsl.page;
  const screenKey = page.id || page.title || 'page';
  const context: ExtractionContext = {
    screenKey,
    documentPath: options.documentPath
  };

  const rootChildren = page.components.map((component, index) =>
    buildNode(component, {
      component,
      entityPath: `/page/components/${index}`,
      ownerPath: '/page/components',
      slotName: 'components'
    }, context)
  );

  const rootNode: SemanticDiffIRNode = {
    nodeId: `screen:${screenKey}:root`,
    componentKind: 'PageRoot',
    stableId: page.id,
    screenKey,
    ownerPath: '/page',
    sourceRef: {
      documentPath: options.documentPath,
      entityPath: '/page'
    },
    props: sortSurface({
      id: makeExplicitValue(page.id, '/page/id', options.documentPath),
      title: makeExplicitValue(page.title, '/page/title', options.documentPath)
    }),
    layout: page.layout
      ? {
          layout: makeExplicitValue(page.layout, '/page/layout', options.documentPath)
        }
      : undefined,
    children: rootChildren
  };

  return {
    screenKey,
    name: page.title,
    sourceRef: {
      documentPath: options.documentPath,
      entityPath: '/page'
    },
    rootNode
  };
}

export function buildSemanticDiffIR(
  dsl: TextUIDSL,
  options: BuildSemanticDiffIROptions = {}
): SemanticDiffIRRoot {
  return {
    schemaVersion: 'semantic-diff-ir/v1',
    entryDocumentPath: options.documentPath,
    screens: [buildScreen(dsl, options)]
  };
}
