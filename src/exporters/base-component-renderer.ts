import type { 
  TextUIDSL, 
  ComponentDef, 
  FormComponent, 
  FormField, 
  FormAction,
  TextComponent,
  InputComponent,
  ButtonComponent,
  CheckboxComponent,
  RadioComponent,
  SelectComponent,
  DatePickerComponent,
  DividerComponent,
  SpacerComponent,
  AlertComponent,
  ContainerComponent,
  AccordionComponent,
  TabsComponent,
  TreeViewComponent,
  TableComponent,
  LinkComponent,
  BreadcrumbComponent,
  BadgeComponent,
  ProgressComponent,
  ImageComponent,
  IconComponent
} from '../renderer/types';
import type { ExportOptions, Exporter } from './export-types';
import type { ExporterRendererMethod } from '../components/definitions/types';
import { StyleManager, type ExportFormat } from '../utils/style-manager';
import { getComponentName } from '../registry/component-registry';
import { COMPONENT_DEFINITIONS } from '../components/definitions/component-definitions';
import { getTokenStylePropertyKebab } from '../components/definitions/token-style-property-map';
import { AttributeSerializer, type ExporterAstNode, renderExporterAst } from './exporter-ast';

export type ComponentHandler = (props: unknown, key: number) => string;

/**
 * コンポーネントレンダリングの基底クラス
 * Mapベースのディスパッチにより、新コンポーネント追加時の変更箇所を最小化
 */
export abstract class BaseComponentRenderer implements Exporter {
  protected format: ExportFormat;
  private componentHandlers: Map<string, ComponentHandler> = new Map();
  private readonly attributeSerializer: AttributeSerializer;
  private static readonly SPACER_SIZE_MAP: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', string> = {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  };

  constructor(format: ExportFormat) {
    this.format = format;
    this.attributeSerializer = new AttributeSerializer(value => this.escapeAttribute(value));
    this.initializeHandlers();
  }

  /**
   * 組み込みコンポーネントのハンドラーを登録
   * サブクラスでオーバーライドして追加コンポーネントを登録可能
   */
  protected initializeHandlers(): void {
    for (const def of COMPONENT_DEFINITIONS) {
      const method = def.exporterRendererMethod;
      this.componentHandlers.set(def.name, (props, key) =>
        this.dispatchExporterRenderer(method, props, key)
      );
    }
  }

  /**
   * `ExporterRendererMethod` と `renderXxx` 実装をコンパイル時に対応付ける（`(this as any)[method]` を排除）。
   */
  protected dispatchExporterRenderer(method: ExporterRendererMethod, props: unknown, key: number): string {
    switch (method) {
      case 'renderText':
        return this.renderText(props as TextComponent, key);
      case 'renderInput':
        return this.renderInput(props as InputComponent, key);
      case 'renderButton':
        return this.renderButton(props as ButtonComponent, key);
      case 'renderCheckbox':
        return this.renderCheckbox(props as CheckboxComponent, key);
      case 'renderRadio':
        return this.renderRadio(props as RadioComponent, key);
      case 'renderSelect':
        return this.renderSelect(props as SelectComponent, key);
      case 'renderDatePicker':
        return this.renderDatePicker(props as DatePickerComponent, key);
      case 'renderDivider':
        return this.renderDivider(props as DividerComponent, key);
      case 'renderSpacer':
        return this.renderSpacer(props as SpacerComponent, key);
      case 'renderAlert':
        return this.renderAlert(props as AlertComponent, key);
      case 'renderContainer':
        return this.renderContainer(props as ContainerComponent, key);
      case 'renderForm':
        return this.renderForm(props as FormComponent, key);
      case 'renderAccordion':
        return this.renderAccordion(props as AccordionComponent, key);
      case 'renderTabs':
        return this.renderTabs(props as TabsComponent, key);
      case 'renderTreeView':
        return this.renderTreeView(props as TreeViewComponent, key);
      case 'renderTable':
        return this.renderTable(props as TableComponent, key);
      case 'renderLink':
        return this.renderLink(props as LinkComponent, key);
      case 'renderBreadcrumb':
        return this.renderBreadcrumb(props as BreadcrumbComponent, key);
      case 'renderBadge':
        return this.renderBadge(props as BadgeComponent, key);
      case 'renderProgress':
        return this.renderProgress(props as ProgressComponent, key);
      case 'renderImage':
        return this.renderImage(props as ImageComponent, key);
      case 'renderIcon':
        return this.renderIcon(props as IconComponent, key);
      default: {
        const _exhaustive: never = method;
        return _exhaustive;
      }
    }
  }

  abstract export(dsl: TextUIDSL, options: ExportOptions): Promise<string>;
  abstract getFileExtension(): string;

  /**
   * コンポーネントのレンダリング（Mapベースのディスパッチ）
   * if-else連鎖を排除し、レジストリに登録されたハンドラーで処理
   */
  protected renderComponent(comp: ComponentDef, key: number): string {
    const componentRecord = comp as unknown as Record<string, unknown>;
    const name = getComponentName(componentRecord);
    const props = name ? componentRecord[name] : undefined;

    if (name && props !== undefined) {
      const handler = this.componentHandlers.get(name);
      if (handler) {
        return handler(props, key);
      }
    }

    return this.renderUnsupportedComponent(comp, key);
  }

  /**
   * FormFieldのレンダリング（Mapベースのディスパッチ）
   * FormField / FormAction も同じハンドラーMapで処理し、if-else連鎖を排除
   */
  protected renderFormField(field: FormField, index: number): string {
    const fieldRecord = field as unknown as Record<string, unknown>;
    const name = getComponentName(fieldRecord);
    const props = name ? fieldRecord[name] : undefined;

    if (name && props !== undefined) {
      const handler = this.componentHandlers.get(name);
      if (handler) {
        return handler(props, index);
      }
    }
    return '';
  }

  /**
   * FormActionのレンダリング
   */
  protected renderFormAction(action: FormAction, index: number): string {
    if (action.Button) {
      const handler = this.componentHandlers.get('Button');
      if (handler) {
        return handler(action.Button, index);
      }
    }
    return '';
  }

  /**
   * カスタムコンポーネントハンドラーを登録
   * 外部から新しいコンポーネントタイプを追加するための公開API
   */
  public registerComponentHandler(name: string, handler: ComponentHandler): void {
    this.componentHandlers.set(name, handler);
  }

  /**
   * 登録済みコンポーネント名の一覧を取得
   */
  public getRegisteredComponents(): string[] {
    return Array.from(this.componentHandlers.keys());
  }

  protected renderUnsupportedComponent(comp: ComponentDef, _key: number): string {
    const componentName = getComponentName(comp as Record<string, unknown>) || 'unknown';
    switch (this.format) {
      case 'html':
        return `    <!-- 未対応コンポーネント: ${componentName} -->`;
      case 'react':
        return `      {/* 未対応コンポーネント: ${componentName} */}`;
      case 'pug':
        return `      //- 未対応コンポーネント: ${componentName}`;
      default:
        return `<!-- 未対応コンポーネント: ${componentName} -->`;
    }
  }

  protected abstract renderText(props: TextComponent, key: number): string;
  protected abstract renderInput(props: InputComponent, key: number): string;
  protected abstract renderButton(props: ButtonComponent, key: number): string;
  protected abstract renderCheckbox(props: CheckboxComponent, key: number): string;
  protected abstract renderRadio(props: RadioComponent, key: number): string;
  protected abstract renderSelect(props: SelectComponent, key: number): string;
  protected abstract renderDatePicker(props: DatePickerComponent, key: number): string;
  protected abstract renderDivider(props: DividerComponent, key: number): string;
  protected abstract renderSpacer(props: SpacerComponent, key: number): string;
  protected abstract renderAlert(props: AlertComponent, key: number): string;
  protected abstract renderContainer(props: ContainerComponent, key: number): string;
  protected abstract renderForm(props: FormComponent, key: number): string;
  protected abstract renderAccordion(props: AccordionComponent, key: number): string;
  protected abstract renderTabs(props: TabsComponent, key: number): string;
  protected abstract renderTreeView(props: TreeViewComponent, key: number): string;
  protected abstract renderTable(props: TableComponent, key: number): string;
  protected abstract renderLink(props: LinkComponent, key: number): string;
  protected abstract renderBreadcrumb(props: BreadcrumbComponent, key: number): string;
  protected abstract renderBadge(props: BadgeComponent, key: number): string;
  protected abstract renderProgress(props: ProgressComponent, key: number): string;
  protected abstract renderImage(props: ImageComponent, key: number): string;
  protected abstract renderIcon(props: IconComponent, key: number): string;

  protected getStyleManager(): typeof StyleManager {
    return StyleManager;
  }

  protected renderPageComponents(dsl: TextUIDSL, separator: string = '\n'): string {
    const components = dsl.page?.components || [];
    return components.map((comp, index) => this.renderComponent(comp, index)).join(separator);
  }

  protected getDisabledClass(disabled: boolean = false): string {
    return disabled ? 'opacity-50 cursor-not-allowed' : '';
  }

  protected adjustIndentation(code: string, baseIndent: string = '    '): string {
    return code.split('\n').map(line => `${baseIndent}${line}`).join('\n');
  }

  protected renderChildren(children: ComponentDef[], baseIndent: string = '  '): string {
    return children.map((child, index) => {
      const childCode = this.renderComponent(child, index);
      return this.adjustIndentation(childCode, baseIndent);
    }).join('\n');
  }

  protected renderAst(node: ExporterAstNode, indentUnit: string = '  ', baseDepth: number = 0): string {
    return renderExporterAst(node, indentUnit, baseDepth);
  }

  protected resolveSpacerDimensions(props: SpacerComponent): { width: string; height: string } {
    const { axis = 'vertical', size = 'md', width, height, token } = props;
    const fallbackSize = token || BaseComponentRenderer.SPACER_SIZE_MAP[size];
    return {
      width: width || (axis === 'horizontal' ? fallbackSize : '100%'),
      height: height || (axis === 'horizontal' ? '1px' : fallbackSize)
    };
  }

  protected resolveActiveTabIndex(defaultTab: number, itemCount: number): number {
    return Math.min(Math.max(defaultTab, 0), Math.max(itemCount - 1, 0));
  }

  protected toTableCellText(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }

  private resolveTokenStyleProperty(componentType: string): string | undefined {
    return getTokenStylePropertyKebab(componentType);
  }

  private buildInlineCssDeclaration(property: string, token: string): string {
    return `${property}: ${this.escapeAttribute(token)};`;
  }

  private toReactStyleProperty(property: string): string {
    return property.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
  }

  protected getHtmlTokenStyleAttr(componentType: string, token?: string): string {
    return this.buildTokenStyleAttr(componentType, token, 'raw');
  }

  protected getPugTokenStyleAttr(componentType: string, token?: string): string {
    return this.buildTokenStyleAttr(componentType, token, 'raw');
  }

  protected getPugTokenStyleSuffix(componentType: string, token?: string): string {
    return this.buildTokenStyleAttr(componentType, token, 'suffix');
  }

  protected getPugTokenStyleModifier(componentType: string, token?: string): string {
    return this.buildTokenStyleAttr(componentType, token, 'modifier');
  }

  private buildTokenStyleAttr(
    componentType: string,
    token: string | undefined,
    mode: 'raw' | 'suffix' | 'modifier'
  ): string {
    const property = this.resolveTokenStyleProperty(componentType);
    if (!property || !token) {
      return '';
    }

    const raw = ` style="${this.buildInlineCssDeclaration(property, token)}"`;
    if (mode === 'suffix') {
      return raw;
    }
    if (mode === 'modifier') {
      return `(${raw.trim()})`;
    }
    return raw;
  }

  protected getReactTokenStyleProp(componentType: string, token?: string): string {
    const property = this.resolveTokenStyleProperty(componentType);
    if (!property || !token) {
      return '';
    }

    const reactProperty = this.toReactStyleProperty(property);
    return ` style={{ ${reactProperty}: ${JSON.stringify(token)} }}`;
  }

  protected getReactTokenStyleInline(componentType: string, token?: string): string {
    return this.getReactTokenStyleProp(componentType, token).trim();
  }

  protected escapeHtml(value: unknown): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  protected escapeAttribute(value: unknown): string {
    return this.escapeHtml(value);
  }



  protected buildLabeledFieldBlock(
    label: string | undefined,
    fieldContent: string,
    wrapperStart: string,
    wrapperEnd: string,
    buildLabelLine: (safeLabel: string) => string
  ): string {
    let code = wrapperStart;
    if (label) {
      code += `
${buildLabelLine(this.escapeHtml(label))}`;
    }
    code += `
${fieldContent}`;
    if (wrapperEnd) {
      code += `
${wrapperEnd}`;
    }
    return code;
  }

  protected buildControlRowWithLabel(
    label: string | undefined,
    controlContent: string,
    rowStart: string,
    rowEnd: string,
    buildLabelLine: (safeLabel: string) => string
  ): string {
    let code = rowStart;
    code += `
${controlContent}`;
    if (label) {
      code += `
${buildLabelLine(this.escapeHtml(label))}`;
    }
    if (rowEnd) {
      code += `
${rowEnd}`;
    }
    return code;
  }


  protected buildAttrs(attrs: Record<string, string | boolean | undefined>): string {
    return this.attributeSerializer.serialize(attrs);
  }

}
