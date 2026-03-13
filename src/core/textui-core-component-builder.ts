import type { ComponentDef } from '../renderer/types';
import { getTextUiComponentCatalog } from './component-catalog';
import type { ComponentBlueprint, TreeViewBlueprintItem } from './textui-core-engine';

type ComponentItemsBlueprint = TreeViewBlueprintItem[] | Array<Record<string, unknown> & { components?: ComponentBlueprint[] }>;

interface ComponentSpecContext {
  buildComponent: (component: ComponentBlueprint) => ComponentDef;
  buildComponentItems: (items: ComponentItemsBlueprint) => Array<Record<string, unknown>>;
  buildTreeViewItems: (items: TreeViewBlueprintItem[]) => Array<Record<string, unknown>>;
  toFieldName: (label: string) => string;
}

type ComponentSpecHandler = (props: Record<string, unknown>, component: ComponentBlueprint, context: ComponentSpecContext) => void;

interface ComponentSpec {
  applyDefaults?: ComponentSpecHandler;
  resolveChildren?: ComponentSpecHandler;
}

const SUPPORTED_COMPONENTS = new Set(getTextUiComponentCatalog().map(item => item.name));

const COMPONENT_SPECS = {
  Container: {
    resolveChildren: (props, component, context) => {
      if (component.components) {
        props.components = component.components.map(child => context.buildComponent(child));
      }
    }
  },
  Form: {
    resolveChildren: (props, component, context) => {
      if (component.fields) {
        props.fields = component.fields.map(field => context.buildComponent(field));
      } else if (!Array.isArray(props.fields)) {
        props.fields = [];
      }

      if (component.actions) {
        props.actions = component.actions.map(action => context.buildComponent(action));
      }
    }
  },
  Tabs: {
    applyDefaults: props => {
      if (!Array.isArray(props.items) || props.items.length === 0) {
        props.items = [{ label: 'タブ1', components: [] }];
      }
    },
    resolveChildren: (props, component, context) => {
      if (component.items) {
        props.items = context.buildComponentItems(component.items);
      }
    }
  },
  Accordion: {
    applyDefaults: props => {
      if (!Array.isArray(props.items) || props.items.length === 0) {
        props.items = [{ title: 'セクション', content: '内容' }];
      }
    },
    resolveChildren: (props, component, context) => {
      if (component.items) {
        props.items = context.buildComponentItems(component.items);
      }
    }
  },
  TreeView: {
    applyDefaults: props => {
      if (!Array.isArray(props.items) || props.items.length === 0) {
        props.items = [{ label: 'ルート', expanded: true, children: [{ label: '子ノード' }] }];
      }
    },
    resolveChildren: (props, component, context) => {
      if (component.items) {
        props.items = context.buildTreeViewItems(component.items as TreeViewBlueprintItem[]);
      }
    }
  },
  Text: {
    applyDefaults: props => {
      if (typeof props.value !== 'string' || !props.value.trim()) {
        props.value = 'テキスト';
      }
    }
  },
  Input: {
    applyDefaults: (props, _component, context) => {
      if (typeof props.label !== 'string' || !props.label.trim()) {
        props.label = '入力';
      }
      if (typeof props.name !== 'string' || !props.name.trim()) {
        props.name = context.toFieldName(String(props.label));
      }
      if (typeof props.type !== 'string' || !props.type.trim()) {
        props.type = 'text';
      }
    }
  },
  Button: {
    applyDefaults: props => {
      if (typeof props.label !== 'string' || !props.label.trim()) {
        props.label = '実行';
      }
    }
  },
  Checkbox: {
    applyDefaults: (props, _component, context) => {
      if (typeof props.label !== 'string' || !props.label.trim()) {
        props.label = '同意する';
      }
      if (typeof props.name !== 'string' || !props.name.trim()) {
        props.name = context.toFieldName(String(props.label));
      }
    }
  },
  Radio: {
    applyDefaults: props => {
      if (typeof props.name !== 'string' || !props.name.trim()) {
        props.name = 'radio';
      }
      if (!Array.isArray(props.options) || props.options.length === 0) {
        props.options = [{ label: '選択肢1', value: 'option1' }];
      }
    }
  },
  Select: {
    applyDefaults: props => {
      if (typeof props.name !== 'string' || !props.name.trim()) {
        props.name = 'select';
      }
      if (!Array.isArray(props.options) || props.options.length === 0) {
        props.options = [{ label: '選択肢1', value: 'option1' }];
      }
    }
  },
  DatePicker: {
    applyDefaults: props => {
      if (typeof props.label !== 'string' || !props.label.trim()) {
        props.label = '日付';
      }
      if (typeof props.name !== 'string' || !props.name.trim()) {
        props.name = 'date';
      }
    }
  },
  Alert: {
    applyDefaults: props => {
      if (typeof props.message !== 'string' || !props.message.trim()) {
        props.message = '通知メッセージ';
      }
    }
  },
  Table: {
    applyDefaults: props => {
      if (!Array.isArray(props.columns) || props.columns.length === 0) {
        props.columns = [{ key: 'name', header: '名称' }];
      }
      if (!Array.isArray(props.rows) || props.rows.length === 0) {
        props.rows = [{ name: 'サンプル' }];
      }
    }
  }
} satisfies Partial<Record<string, ComponentSpec>>;

type ComponentSpecType = keyof typeof COMPONENT_SPECS;

function isComponentSpecType(value: string): value is ComponentSpecType {
  return value in COMPONENT_SPECS;
}

export function getComponentSpecTypesForTesting(): string[] {
  return Object.keys(COMPONENT_SPECS);
}

export function getComponentSpecHandlerFlagsForTesting(): Record<string, { applyDefaults: boolean; resolveChildren: boolean }> {
  return Object.fromEntries(
    Object.entries(COMPONENT_SPECS).map(([type, spec]) => {
      const normalized = spec as ComponentSpec;
      return [type, {
        applyDefaults: typeof normalized.applyDefaults === 'function',
        resolveChildren: typeof normalized.resolveChildren === 'function'
      }];
    })
  );
}

export class TextUiCoreComponentBuilder {
  buildComponents(components: ComponentBlueprint[]): ComponentDef[] {
    return components.map(component => this.buildComponent(component));
  }

  buildComponent(component: ComponentBlueprint): ComponentDef {
    if (!SUPPORTED_COMPONENTS.has(component.type)) {
      throw new Error(`未対応コンポーネント: ${component.type}`);
    }

    const props: Record<string, unknown> = { ...(component.props ?? {}) };
    const spec = this.getComponentSpec(component.type);
    const context: ComponentSpecContext = {
      buildComponent: child => this.buildComponent(child),
      buildComponentItems: items => this.buildComponentItems(items),
      buildTreeViewItems: items => this.buildTreeViewItems(items),
      toFieldName: label => this.toFieldName(label)
    };

    if (spec?.applyDefaults) {
      spec.applyDefaults(props, component, context);
    }
    if (spec?.resolveChildren) {
      spec.resolveChildren(props, component, context);
    }

    return { [component.type]: props } as unknown as ComponentDef;
  }

  private getComponentSpec(componentType: string): ComponentSpec | undefined {
    if (!isComponentSpecType(componentType)) {
      return undefined;
    }
    return COMPONENT_SPECS[componentType];
  }

  private buildComponentItems(items: ComponentItemsBlueprint): Array<Record<string, unknown>> {
    return items.map(item => {
      const next: Record<string, unknown> = { ...item };
      if (item.components) {
        next.components = item.components.map(child => this.buildComponent(child));
      }
      return next;
    });
  }

  private buildTreeViewItems(items: TreeViewBlueprintItem[]): Array<Record<string, unknown>> {
    return items.map(item => {
      const next: Record<string, unknown> = { ...item };
      if (item.components) {
        next.components = item.components.map(child => this.buildComponent(child));
      }
      if (item.children) {
        next.children = this.buildTreeViewItems(item.children);
      }
      return next;
    });
  }

  private toFieldName(label: string): string {
    const normalized = label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return normalized || 'field';
  }
}
