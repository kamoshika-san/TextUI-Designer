import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { validateDsl } from '../cli/validator';
import { getSupportedProviderNames, runExport } from '../cli/exporter-runner';
import type { ValidationIssue } from '../cli/types';
import type { ComponentDef, TextUIDSL } from '../renderer/types';
import { getTextUiComponentCatalog, type TextUIComponentCatalogEntry } from './component-catalog';

export interface ComponentBlueprint {
  type: string;
  props?: Record<string, unknown>;
  components?: ComponentBlueprint[];
  fields?: ComponentBlueprint[];
  actions?: ComponentBlueprint[];
  items?: TreeViewBlueprintItem[] | Array<Record<string, unknown> & { components?: ComponentBlueprint[] }>;
}

export interface TreeViewBlueprintItem extends Record<string, unknown> {
  components?: ComponentBlueprint[];
  children?: TreeViewBlueprintItem[];
}

export interface GenerateUiRequest {
  title: string;
  pageId?: string;
  layout?: string;
  components?: ComponentBlueprint[];
  format?: string;
  providerModulePath?: string;
  themePath?: string;
}

export interface CoreDiagnostic extends ValidationIssue {
  severity: 'error' | 'warning';
  hint: string;
}

export interface ValidateUiRequest {
  dsl: unknown;
  sourcePath?: string;
  skipTokenValidation?: boolean;
}

export interface ValidateUiResponse {
  valid: boolean;
  diagnostics: CoreDiagnostic[];
  normalizedDsl?: TextUIDSL;
  normalizedYaml?: string;
}

export interface ExplainErrorRequest {
  diagnostics: Array<Pick<CoreDiagnostic, 'message' | 'path' | 'level'>>;
}

export interface PreviewSchemaRequest {
  schema?: 'main' | 'template' | 'theme';
  jsonPointer?: string;
}

export interface GenerateUiResponse {
  dsl: TextUIDSL;
  yaml: string;
  validation: ValidateUiResponse;
  exportedCode?: string;
}

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

function isComponentSpecType(value: string): value is ComponentSpecType {
  return value in COMPONENT_SPECS;
}

export class TextUICoreEngine {
  async generateUi(request: GenerateUiRequest): Promise<GenerateUiResponse> {
    const dsl: TextUIDSL = {
      page: {
        id: request.pageId ?? this.toPageId(request.title),
        title: request.title,
        layout: request.layout ?? 'vertical',
        components: this.buildComponents(request.components ?? [])
      }
    };

    const validation = this.validateUi({
      dsl,
      skipTokenValidation: true
    });

    let exportedCode: string | undefined;
    if (request.format) {
      exportedCode = await runExport(dsl, request.format, {
        providerModulePath: request.providerModulePath,
        themePath: request.themePath
      });
    }

    return {
      dsl,
      yaml: YAML.stringify(dsl),
      validation,
      exportedCode
    };
  }

  validateUi(request: ValidateUiRequest): ValidateUiResponse {
    try {
      const normalizedDsl = this.parseDsl(request.dsl);
      const result = validateDsl(normalizedDsl, {
        sourcePath: request.sourcePath,
        skipTokenValidation: request.skipTokenValidation ?? true
      });

      return {
        valid: result.valid,
        diagnostics: result.issues.map(issue => this.mapDiagnostic(issue)),
        normalizedDsl,
        normalizedYaml: YAML.stringify(normalizedDsl)
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        diagnostics: [{
          level: 'error',
          severity: 'error',
          message: message || 'DSLの解析に失敗しました',
          path: '/',
          hint: 'YAML/JSON形式とpage定義を確認してください。'
        }]
      };
    }
  }

  explainError(request: ExplainErrorRequest): { summary: string; suggestions: Array<{ path: string; message: string; hint: string }> } {
    const suggestions = request.diagnostics.map(issue => ({
      path: issue.path ?? '/',
      message: issue.message,
      hint: this.mapHint(issue.message)
    }));

    if (suggestions.length === 0) {
      return {
        summary: 'エラーはありません。',
        suggestions: []
      };
    }

    const first = suggestions[0];
    return {
      summary: `主な原因: ${first.path} ${first.message}`,
      suggestions
    };
  }

  previewSchema(request: PreviewSchemaRequest = {}): {
    schema: 'main' | 'template' | 'theme';
    jsonPointer?: string;
    value: unknown;
  } {
    const schema = request.schema ?? 'main';
    const schemaPath = this.resolveSchemaPath(schema);
    const raw = fs.readFileSync(schemaPath, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const value = request.jsonPointer
      ? this.resolveJsonPointer(parsed, request.jsonPointer)
      : parsed;

    return {
      schema,
      jsonPointer: request.jsonPointer,
      value
    };
  }

  async listComponents(): Promise<{ components: TextUIComponentCatalogEntry[]; supportedProviders: string[] }> {
    return {
      components: getTextUiComponentCatalog(),
      supportedProviders: await this.getSupportedProviders()
    };
  }

  private parseDsl(input: unknown): TextUIDSL {
    const parsed = typeof input === 'string'
      ? this.parseText(input)
      : (input as Record<string, unknown>);

    if (!parsed || typeof parsed !== 'object' || !('page' in parsed)) {
      throw new Error('DSLにはpageルートが必要です');
    }

    return parsed as unknown as TextUIDSL;
  }

  private parseText(raw: string): Record<string, unknown> {
    const trimmed = raw.trim();
    if (!trimmed) {
      throw new Error('DSL文字列が空です');
    }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return JSON.parse(trimmed) as Record<string, unknown>;
    }

    return YAML.parse(trimmed) as Record<string, unknown>;
  }

  private buildComponents(components: ComponentBlueprint[]): ComponentDef[] {
    return components.map(component => this.buildComponent(component));
  }

  private buildComponent(component: ComponentBlueprint): ComponentDef {
    if (!SUPPORTED_COMPONENTS.has(component.type)) {
      throw new Error(`未対応コンポーネント: ${component.type}`);
    }

    const props: Record<string, unknown> = {
      ...(component.props ?? {})
    };
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

    return {
      [component.type]: props
    } as unknown as ComponentDef;
  }

  private mapDiagnostic(issue: ValidationIssue): CoreDiagnostic {
    return {
      ...issue,
      severity: issue.level === 'error' ? 'error' : 'warning',
      hint: this.mapHint(issue.message)
    };
  }

  private mapHint(message: string): string {
    if (message.includes('must have required property')) {
      return '必須プロパティを追加してください。';
    }
    if (message.includes('must be')) {
      return '型・enum制約に合わせて値を修正してください。';
    }
    if (message.includes('重複ID')) {
      return 'idを一意に変更してください。';
    }
    if (message.includes('token')) {
      return 'token名とtheme定義の整合を確認してください。';
    }
    return 'schema.jsonとDSL構造を見比べて修正してください。';
  }

  private resolveSchemaPath(schema: 'main' | 'template' | 'theme'): string {
    if (schema === 'template') {
      return path.resolve(__dirname, '../../schemas/template-schema.json');
    }
    if (schema === 'theme') {
      return path.resolve(__dirname, '../../schemas/theme-schema.json');
    }
    return path.resolve(__dirname, '../../schemas/schema.json');
  }

  private resolveJsonPointer(target: unknown, pointer: string): unknown {
    if (!pointer || pointer === '/') {
      return target;
    }
    if (!pointer.startsWith('/')) {
      throw new Error(`jsonPointerは "/" で始めてください: ${pointer}`);
    }

    const parts = pointer
      .slice(1)
      .split('/')
      .map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));

    let current: unknown = target;
    for (const part of parts) {
      if (Array.isArray(current)) {
        const index = Number(part);
        if (Number.isNaN(index)) {
          throw new Error(`配列インデックスが不正です: ${part}`);
        }
        current = current[index];
        continue;
      }
      if (!current || typeof current !== 'object') {
        throw new Error(`jsonPointerが解決できません: ${pointer}`);
      }
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  private toPageId(title: string): string {
    const normalized = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return normalized || 'generated-page';
  }

  private getComponentSpec(componentType: string): ComponentSpec | undefined {
    if (!isComponentSpecType(componentType)) {
      return undefined;
    }
    return COMPONENT_SPECS[componentType];
  }

  private buildComponentItems(
    items: ComponentItemsBlueprint
  ): Array<Record<string, unknown>> {
    return items.map(item => {
      const next: Record<string, unknown> = { ...item };
      if (item.components) {
        next.components = item.components.map(child => this.buildComponent(child));
      }
      return next;
    });
  }

  private toFieldName(label: string): string {
    const normalized = label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return normalized || 'field';
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

  async getSupportedProviders(): Promise<string[]> {
    return getSupportedProviderNames();
  }
}
