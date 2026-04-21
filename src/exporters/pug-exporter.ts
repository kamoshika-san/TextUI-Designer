import type {
  TextUIDSL,
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
  IconComponent,
  ModalComponent,
  FormComponent,
  FormAction,
  FormField,
  ComponentDef
} from '../domain/dsl-types';
import type { ExportOptions, Exporter } from './export-types';
import type { ExporterRendererMethod } from '../components/definitions/types';
import { StyleManager, type ExportFormat } from '../utils/style-manager';
import type { ExporterAstNode } from './exporter-ast';
import { renderExporterAst } from './exporter-ast';
import {
  buildAttrs,
  escapeAttribute,
  escapeHtml
} from './format/escaping';
import { adjustIndentation } from './format/indentation';
import {
  getPugTokenStyleModifier,
  getPugTokenStyleSuffix
} from './format/token-style';
import {
  createExporterComponentHandlers,
  renderTraversedComponent,
  renderTraversedFormAction,
  renderTraversedFormField,
  renderTraversedPageComponents,
  type ComponentHandler
} from './exporter-dsl-traversal';
import { renderUnsupportedComponent as renderUnsupportedComponentPolicy } from './unsupported-policy';
import { buildPugPageDocument } from './pug/pug-page-document';
import {
  renderPugText,
  renderPugDivider,
  renderPugSpacer,
  renderPugAlert,
  renderPugBadge,
  renderPugProgress,
  renderPugImage,
  renderPugIcon,
  renderPugLink
} from './pug/pug-basic-templates';
import {
  renderPugInput,
  renderPugButton,
  renderPugCheckbox,
  renderPugRadio,
  renderPugSelect,
  renderPugDatePicker
} from './pug/pug-form-fragments';
import {
  renderPugBreadcrumb,
  renderPugAccordion,
  renderPugTabs,
  renderPugTreeView,
  renderPugTable,
  renderPugContainer,
  renderPugForm
} from './pug/pug-layout-templates';

export class PugExporter implements Exporter {
  private static readonly SPACER_SIZE_MAP: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', string> = {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  };

  private static readonly EXPORTER_RENDERER_DISPATCH: {
    [K in ExporterRendererMethod]: (
      self: PugExporter,
      props: unknown,
      key: number
    ) => string;
  } = {
    renderText: (self, p, k) => self.renderText(p as TextComponent, k),
    renderInput: (self, p, k) => self.renderInput(p as InputComponent, k),
    renderButton: (self, p, k) => self.renderButton(p as ButtonComponent, k),
    renderCheckbox: (self, p, k) => self.renderCheckbox(p as CheckboxComponent, k),
    renderRadio: (self, p, k) => self.renderRadio(p as RadioComponent, k),
    renderSelect: (self, p, k) => self.renderSelect(p as SelectComponent, k),
    renderDatePicker: (self, p, k) => self.renderDatePicker(p as DatePickerComponent, k),
    renderDivider: (self, p, k) => self.renderDivider(p as DividerComponent, k),
    renderSpacer: (self, p, k) => self.renderSpacer(p as SpacerComponent, k),
    renderAlert: (self, p, k) => self.renderAlert(p as AlertComponent, k),
    renderContainer: (self, p, k) => self.renderContainer(p as ContainerComponent, k),
    renderForm: (self, p, k) => self.renderForm(p as FormComponent, k),
    renderAccordion: (self, p, k) => self.renderAccordion(p as AccordionComponent, k),
    renderTabs: (self, p, k) => self.renderTabs(p as TabsComponent, k),
    renderTreeView: (self, p, k) => self.renderTreeView(p as TreeViewComponent, k),
    renderTable: (self, p, k) => self.renderTable(p as TableComponent, k),
    renderLink: (self, p, k) => self.renderLink(p as LinkComponent, k),
    renderBreadcrumb: (self, p, k) => self.renderBreadcrumb(p as BreadcrumbComponent, k),
    renderBadge: (self, p, k) => self.renderBadge(p as BadgeComponent, k),
    renderProgress: (self, p, k) => self.renderProgress(p as ProgressComponent, k),
    renderImage: (self, p, k) => self.renderImage(p as ImageComponent, k),
    renderIcon: (self, p, k) => self.renderIcon(p as IconComponent, k),
    renderModal: (self, p, k) => self.renderModal(p as ModalComponent, k)
  };

  private readonly format: ExportFormat = 'pug';
  private componentHandlers: Map<string, ComponentHandler>;

  constructor() {
    this.componentHandlers = createExporterComponentHandlers(
      (method, props, key) => this.dispatchExporterRenderer(method, props, key)
    );
  }

  async export(dsl: TextUIDSL, _options: ExportOptions): Promise<string> {
    const componentCode = this.renderPageComponents(dsl);
    return buildPugPageDocument(componentCode);
  }

  getFileExtension(): string {
    return '.pug';
  }

  private dispatchExporterRenderer(method: ExporterRendererMethod, props: unknown, key: number): string {
    return PugExporter.EXPORTER_RENDERER_DISPATCH[method](this, props, key);
  }

  private renderComponent(comp: ComponentDef, key: number): string {
    return renderTraversedComponent(comp, key, {
      renderText: (props, index) => this.renderText(props, index),
      renderButton: (props, index) => this.renderButton(props, index),
      renderUnsupportedComponent: (component, index) => this.renderUnsupportedComponent(component, index)
    }, this.componentHandlers);
  }

  private renderFormField(field: FormField, index: number): string {
    return renderTraversedFormField(field, index, {
      renderText: (props, itemIndex) => this.renderText(props, itemIndex),
      renderButton: (props, itemIndex) => this.renderButton(props, itemIndex),
      renderUnsupportedComponent: (component, itemIndex) => this.renderUnsupportedComponent(component, itemIndex)
    }, this.componentHandlers);
  }

  private renderFormAction(action: FormAction, index: number): string {
    return renderTraversedFormAction(action, index, {
      renderText: (props, itemIndex) => this.renderText(props, itemIndex),
      renderButton: (props, itemIndex) => this.renderButton(props, itemIndex),
      renderUnsupportedComponent: (component, itemIndex) => this.renderUnsupportedComponent(component, itemIndex)
    }, this.componentHandlers);
  }

  private renderUnsupportedComponent(comp: ComponentDef, _key: number): string {
    return renderUnsupportedComponentPolicy(this.format, comp);
  }

  private getStyleManager(): typeof StyleManager {
    return StyleManager;
  }

  private renderPageComponents(dsl: TextUIDSL, separator: string = '\n'): string {
    return renderTraversedPageComponents(dsl, (component, key) => this.renderComponent(component, key), separator);
  }

  private getDisabledClass(disabled: boolean = false): string {
    return disabled ? 'opacity-50 cursor-not-allowed' : '';
  }

  private adjustIndentation(code: string, baseIndent: string = '    '): string {
    return adjustIndentation(code, baseIndent);
  }

  private renderAst(node: ExporterAstNode, indentUnit: string = '  ', baseDepth: number = 0): string {
    return renderExporterAst(node, indentUnit, baseDepth);
  }

  private resolveSpacerDimensions(props: SpacerComponent): { width: string; height: string } {
    const { axis = 'vertical', size = 'md', width, height, token } = props;
    const fallbackSize = token || PugExporter.SPACER_SIZE_MAP[size];
    return {
      width: width || (axis === 'horizontal' ? fallbackSize : '100%'),
      height: height || (axis === 'horizontal' ? '1px' : fallbackSize)
    };
  }

  private resolveActiveTabIndex(defaultTab: number, itemCount: number): number {
    return Math.min(Math.max(defaultTab, 0), Math.max(itemCount - 1, 0));
  }

  private toTableCellText(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }

  private getPugTokenStyleSuffix(componentType: string, token?: string, tokenSlots?: string[]): string {
    return getPugTokenStyleSuffix(componentType, token, tokenSlots);
  }

  private getPugTokenStyleModifier(componentType: string, token?: string, tokenSlots?: string[]): string {
    return getPugTokenStyleModifier(componentType, token, tokenSlots);
  }

  private escapeHtml(value: unknown): string {
    return escapeHtml(value);
  }

  private escapeAttribute(value: unknown): string {
    return escapeAttribute(value);
  }

  private buildLabeledFieldBlock(
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

  private buildControlRowWithLabel(
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

  private buildAttrs(attrs: Record<string, string | boolean | undefined>): string {
    return buildAttrs(attrs);
  }

  private renderText(props: TextComponent, _key: number): string {
    return renderPugText(props, this.getStyleManager(), this.format, this.getPugTokenStyleSuffix('Text', props.token));
  }

  private renderInput(props: InputComponent, _key: number): string {
    const { required = false, disabled = false, token } = props;
    return renderPugInput(props, {
      disabledClass: this.getDisabledClass(disabled),
      tokenStyle: this.getPugTokenStyleSuffix('Input', token),
      inputAttrs: this.buildAttrs({ required, disabled }),
      buildLabeledFieldBlock: this.buildLabeledFieldBlock.bind(this)
    });
  }

  private renderButton(props: ButtonComponent, _key: number): string {
    const { disabled = false, token } = props;
    return renderPugButton(props, this.getStyleManager(), this.format, {
      disabledClass: this.getDisabledClass(disabled),
      disabledAttr: disabled ? 'disabled' : '',
      tokenStyle: this.getPugTokenStyleSuffix('Button', token),
      escapeHtml: this.escapeHtml.bind(this)
    });
  }

  private renderCheckbox(props: CheckboxComponent, _key: number): string {
    const { checked = false, disabled = false, token } = props;
    return renderPugCheckbox(props, {
      disabledClass: this.getDisabledClass(disabled),
      tokenStyle: this.getPugTokenStyleSuffix('Checkbox', token),
      checkboxAttrs: this.buildAttrs({ checked, disabled }),
      buildControlRowWithLabel: this.buildControlRowWithLabel.bind(this)
    });
  }

  private renderRadio(props: RadioComponent, _key: number): string {
    const { checked = false, disabled = false, token } = props;
    return renderPugRadio(props, {
      disabledClass: this.getDisabledClass(disabled),
      tokenStyle: this.getPugTokenStyleSuffix('Radio', token),
      radioAttrs: this.buildAttrs({ checked, disabled }),
      buildControlRowWithLabel: this.buildControlRowWithLabel.bind(this)
    });
  }

  private renderSelect(props: SelectComponent, _key: number): string {
    const { disabled = false, token } = props;
    return renderPugSelect(props, {
      disabledClass: this.getDisabledClass(disabled),
      tokenStyle: this.getPugTokenStyleSuffix('Select', token),
      selectAttrs: this.buildAttrs({ disabled }),
      buildLabeledFieldBlock: this.buildLabeledFieldBlock.bind(this)
    });
  }

  private renderDatePicker(props: DatePickerComponent, _key: number): string {
    const { required = false, disabled = false, min, max, value, token } = props;
    return renderPugDatePicker(props, {
      disabledClass: this.getDisabledClass(disabled),
      tokenStyle: this.getPugTokenStyleSuffix('DatePicker', token),
      dateInputAttrs: this.buildAttrs({ required, disabled, min, max, value }),
      buildLabeledFieldBlock: this.buildLabeledFieldBlock.bind(this)
    });
  }

  private renderDivider(props: DividerComponent, _key: number): string {
    const { token } = props;
    return renderPugDivider(
      props,
      this.getStyleManager(),
      this.format,
      this.getPugTokenStyleSuffix('Divider', token),
      this.getPugTokenStyleModifier('Divider', token)
    );
  }

  private renderSpacer(props: SpacerComponent, _key: number): string {
    const { width: resolvedWidth, height: resolvedHeight } = this.resolveSpacerDimensions(props);
    return renderPugSpacer(resolvedWidth, resolvedHeight);
  }

  private renderAlert(props: AlertComponent, _key: number): string {
    const { token } = props;
    return renderPugAlert(props, this.getStyleManager(), this.format, this.getPugTokenStyleSuffix('Alert', token));
  }

  private renderBadge(props: BadgeComponent, _key: number): string {
    const { token } = props;
    return renderPugBadge(props, this.escapeHtml.bind(this), this.escapeAttribute.bind(this), this.getPugTokenStyleSuffix('Badge', token));
  }

  private renderProgress(props: ProgressComponent, _key: number): string {
    return renderPugProgress(props, this.escapeHtml.bind(this), this.escapeAttribute.bind(this));
  }

  private renderImage(props: ImageComponent, _key: number): string {
    const { token } = props;
    return renderPugImage(props, this.escapeAttribute.bind(this), this.getPugTokenStyleSuffix('Image', token));
  }

  private renderIcon(props: IconComponent, _key: number): string {
    const { token } = props;
    return renderPugIcon(props, this.escapeHtml.bind(this), this.escapeAttribute.bind(this), this.getPugTokenStyleSuffix('Icon', token));
  }

  private renderModal(props: ModalComponent, _key: number): string {
    const { title, open = true, body, actions, token } = props;
    if (!open) {
      return '';
    }

    const tokenStyle = this.getPugTokenStyleModifier('Modal', token);
    const safeTitle = title ? this.escapeHtml(title) : '';
    const safeBody = body ? this.escapeHtml(body) : '';
    const actionKindClass: Record<'primary' | 'secondary' | 'danger' | 'ghost', string> = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-700 hover:bg-gray-600 text-gray-300',
      danger: 'bg-red-600 hover:bg-red-700 text-white',
      ghost: 'bg-transparent border border-gray-500 text-gray-300 hover:bg-gray-700/30'
    };
    const renderBlockText = (value: string, indent: string): string =>
      value
        .split('\n')
        .map(line => `${indent}| ${line}`)
        .join('\n');

    let code = `      .textui-modal(style="max-width: 32rem; margin-bottom: 1rem;"${tokenStyle})`;
    code += '\n        .textui-modal-surface(style="background-color: rgb(31 41 55); border: 1px solid rgb(75 85 99); border-radius: 0.5rem; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);")';

    if (safeTitle) {
      code += '\n          .textui-modal-header(style="padding: 1rem 1.25rem 0.75rem; border-bottom: 1px solid rgb(55 65 81);")';
      code += `\n            span.textui-modal-title(style="font-size: 1rem; font-weight: 600; color: rgb(243 244 246);") ${safeTitle}`;
    }

    if (safeBody) {
      code += '\n          .textui-modal-body(style="padding: 1rem 1.25rem; font-size: 0.875rem; color: rgb(209 213 219); white-space: pre-line;")';
      code += `\n${renderBlockText(safeBody, '            ')}`;
    }

    if (actions && actions.length > 0) {
      code += '\n          .textui-modal-footer(style="display: flex; justify-content: flex-end; gap: 0.5rem; padding: 0.75rem 1.25rem; border-top: 1px solid rgb(55 65 81);")';
      actions.forEach(action => {
        const kind = action.kind ?? 'secondary';
        const className = actionKindClass[kind] ?? actionKindClass.secondary;
        const safeLabel = this.escapeHtml(action.label ?? '');
        code += `\n            button(type="button" class="textui-modal-action inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${className} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500") ${safeLabel}`;
      });
    }

    return code;
  }

  private renderLink(props: LinkComponent, _key: number): string {
    const { token } = props;
    return renderPugLink(props, this.escapeHtml.bind(this), this.escapeAttribute.bind(this), this.getPugTokenStyleSuffix('Link', token));
  }

  private renderBreadcrumb(props: BreadcrumbComponent, _key: number): string {
    const { token } = props;
    return renderPugBreadcrumb(props, {
      tokenStyleModifier: this.getPugTokenStyleModifier('Breadcrumb', token),
      escapeHtml: this.escapeHtml.bind(this),
      escapeAttribute: this.escapeAttribute.bind(this)
    });
  }

  private renderAccordion(props: AccordionComponent, _key: number): string {
    const { token } = props;
    return renderPugAccordion(props, {
      tokenStyle: this.getPugTokenStyleSuffix('Accordion', token),
      renderComponent: this.renderComponent.bind(this),
      adjustIndentation: this.adjustIndentation.bind(this)
    });
  }

  private renderTabs(props: TabsComponent, _key: number): string {
    const { token } = props;
    return renderPugTabs(props, {
      tokenStyleModifier: this.getPugTokenStyleModifier('Tabs', token),
      resolveActiveTabIndex: this.resolveActiveTabIndex.bind(this),
      renderComponent: this.renderComponent.bind(this),
      adjustIndentation: this.adjustIndentation.bind(this)
    });
  }

  private renderTreeView(props: TreeViewComponent, key: number): string {
    const { token } = props;
    return renderPugTreeView(props, key, {
      tokenStyleModifier: this.getPugTokenStyleModifier('TreeView', token),
      renderComponent: this.renderComponent.bind(this),
      renderAst: this.renderAst.bind(this)
    });
  }

  private renderTable(props: TableComponent, _key: number): string {
    const { token } = props;
    return renderPugTable(props, {
      tokenStyleModifier: this.getPugTokenStyleModifier('Table', token),
      escapeAttribute: this.escapeAttribute.bind(this),
      toTableCellText: this.toTableCellText.bind(this),
      renderComponent: this.renderComponent.bind(this),
      adjustIndentation: this.adjustIndentation.bind(this)
    });
  }

  private renderContainer(props: ContainerComponent, _key: number): string {
    const { token } = props;
    return renderPugContainer(props, {
      tokenStyleModifier: this.getPugTokenStyleModifier('Container', token),
      escapeAttribute: this.escapeAttribute.bind(this),
      renderComponent: this.renderComponent.bind(this),
      adjustIndentation: this.adjustIndentation.bind(this)
    });
  }

  private renderForm(props: FormComponent, _key: number): string {
    const { token } = props;
    return renderPugForm(props, {
      tokenStyle: this.getPugTokenStyleSuffix('Form', token),
      renderFormField: this.renderFormField.bind(this),
      renderFormAction: this.renderFormAction.bind(this),
      adjustIndentation: this.adjustIndentation.bind(this)
    });
  }
}
