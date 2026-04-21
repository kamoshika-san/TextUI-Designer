import type {
  TextUIDSL, FormComponent, FormField, FormAction, ComponentDef,
  TextComponent, InputComponent, ButtonComponent, CheckboxComponent,
  RadioComponent, SelectComponent, DatePickerComponent, DividerComponent, SpacerComponent, AlertComponent,
  ContainerComponent, AccordionComponent, TabsComponent, TreeViewComponent, TableComponent, LinkComponent, BreadcrumbComponent, BadgeComponent, ProgressComponent, ImageComponent, IconComponent, ModalComponent
} from '../domain/dsl-types';
import type { ExportOptions, Exporter } from './export-types';
import type { ExporterRendererMethod } from '../components/definitions/types';
import { StyleManager, type ExportFormat } from '../utils/style-manager';
import {
  buildAttrs,
  escapeHtml
} from './format/escaping';
import { adjustIndentation } from './format/indentation';
import { getReactTokenStyleInline } from './format/token-style';
import {
  createExporterComponentHandlers,
  renderTraversedComponent,
  renderTraversedFormAction,
  renderTraversedFormField,
  renderTraversedPageComponents,
  type ComponentHandler
} from './exporter-dsl-traversal';
import { renderUnsupportedComponent as renderUnsupportedComponentPolicy } from './unsupported-policy';
import { renderAlertTemplate, renderBadgeTemplate, renderBreadcrumbTemplate, renderButtonTemplate, renderDividerTemplate, renderIconTemplate, renderImageTemplate, renderLinkTemplate, renderProgressTemplate, renderSpacerTemplate, renderTextTemplate } from './react-basic-renderer';
import { renderAccordionTemplate, renderContainerTemplate, renderFormTemplate, renderTableTemplate, renderTabsTemplate, renderTreeViewTemplate } from './react-template-renderer';
import { buildReactPageDocument } from './react-export-page-template';
import {
  buildReactCheckboxInputInnerHtml,
  buildReactDateInputInnerHtml,
  buildReactInputInnerHtml,
  buildReactRadioInputInnerHtml,
  buildReactSelectInnerHtml,
  buildReactSelectOptionsLines
} from './react-form-control-templates';

export class ReactExporter implements Exporter {
  private static readonly SPACER_SIZE_MAP: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', string> = {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  };

  private static readonly EXPORTER_RENDERER_DISPATCH: {
    [K in ExporterRendererMethod]: (
      self: ReactExporter,
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

  private readonly format: ExportFormat = 'react';
  private componentHandlers: Map<string, ComponentHandler>;

  constructor() {
    this.componentHandlers = createExporterComponentHandlers(
      (method, props, key) => this.dispatchExporterRenderer(method, props, key)
    );
  }

  async export(dsl: TextUIDSL, _options: ExportOptions): Promise<string> {
    const componentCode = this.renderPageComponents(dsl, '\n\n');
    return buildReactPageDocument(componentCode);
  }

  getFileExtension(): string {
    return '.tsx';
  }

  private dispatchExporterRenderer(method: ExporterRendererMethod, props: unknown, key: number): string {
    return ReactExporter.EXPORTER_RENDERER_DISPATCH[method](this, props, key);
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

  private resolveSpacerDimensions(props: SpacerComponent): { width: string; height: string } {
    const { axis = 'vertical', size = 'md', width, height, token } = props;
    const fallbackSize = token || ReactExporter.SPACER_SIZE_MAP[size];
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

  private getReactTokenStyleInline(componentType: string, token?: string, tokenSlots?: string[]): string {
    return getReactTokenStyleInline(componentType, token, tokenSlots);
  }

  private escapeHtml(value: unknown): string {
    return escapeHtml(value);
  }

  private buildAttrs(attrs: Record<string, string | boolean | undefined>): string {
    return buildAttrs(attrs);
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
      code += `\n${buildLabelLine(this.escapeHtml(label))}`;
    }
    code += `\n${fieldContent}`;
    if (wrapperEnd) {
      code += `\n${wrapperEnd}`;
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
    code += `\n${controlContent}`;
    if (label) {
      code += `\n${buildLabelLine(this.escapeHtml(label))}`;
    }
    if (rowEnd) {
      code += `\n${rowEnd}`;
    }
    return code;
  }

  private renderText(props: TextComponent, key: number): string {
    const styleManager = this.getStyleManager();
    const tokenStyle = this.getReactTokenStyleInline('Text', props.token, props.tokenSlots);
    return renderTextTemplate(props, key, tokenStyle, styleManager, this.format);
  }

  private renderInput(props: InputComponent, key: number): string {
    const { label, placeholder, type = 'text', required = false, disabled = false, token } = props;
    const disabledClass = this.getDisabledClass(disabled);
    const tokenStyle = this.getReactTokenStyleInline('Input', token);

    const inputAttrs = this.buildAttrs({
      required,
      disabled
    });

    const inputHtml = buildReactInputInnerHtml({
      type,
      placeholder: placeholder || '',
      inputAttrs,
      disabledClass,
      tokenStyle
    });

    return this.buildLabeledFieldBlock(
      label,
      inputHtml,
      `      <div key={${key}} className="mb-4">`,
      '      </div>',
      safeLabel => `        <label className="block text-sm font-medium text-gray-700 mb-2 textui-text">${safeLabel}</label>`
    );
  }

  private renderButton(props: ButtonComponent, key: number): string {
    const styleManager = this.getStyleManager();
    const tokenStyle = this.getReactTokenStyleInline('Button', props.token);
    return renderButtonTemplate(props, key, tokenStyle, styleManager, this.format);
  }

  private renderCheckbox(props: CheckboxComponent, key: number): string {
    const { label, checked = false, disabled = false, token } = props;
    const disabledClass = this.getDisabledClass(disabled);
    const tokenStyle = this.getReactTokenStyleInline('Checkbox', token);
    const checkboxAttrs = this.buildAttrs({ disabled });
    const checkboxInput = buildReactCheckboxInputInnerHtml({
      checked,
      checkboxAttrs,
      disabledClass,
      tokenStyle
    });

    return this.buildControlRowWithLabel(
      label,
      checkboxInput,
      `      <div key={${key}} className="flex items-center mb-4">`,
      '      </div>',
      safeLabel => `        <label className="ml-2 block text-sm text-gray-900 textui-text">${safeLabel}</label>`
    );
  }

  private renderRadio(props: RadioComponent, key: number): string {
    const { label, value, name, checked = false, disabled = false, token } = props;
    const disabledClass = this.getDisabledClass(disabled);
    const tokenStyle = this.getReactTokenStyleInline('Radio', token);
    const radioAttrs = this.buildAttrs({ disabled });
    const radioInput = buildReactRadioInputInnerHtml({
      name: name || 'radio',
      value: value || '',
      checked,
      radioAttrs,
      disabledClass,
      tokenStyle
    });

    return this.buildControlRowWithLabel(
      label,
      radioInput,
      `      <div key={${key}} className="textui-radio-option flex items-center mb-4">`,
      '      </div>',
      safeLabel => `        <label className="ml-2 block text-sm text-gray-900 textui-text">${safeLabel}</label>`
    );
  }

  private renderSelect(props: SelectComponent, key: number): string {
    const { label, options = [], placeholder, disabled = false, token } = props;
    const disabledClass = this.getDisabledClass(disabled);
    const tokenStyle = this.getReactTokenStyleInline('Select', token);
    const optionsCode = buildReactSelectOptionsLines(options);

    const selectAttrs = this.buildAttrs({ disabled });

    const placeholderSegment = placeholder ? `<option value="">${placeholder}</option>` : '';

    const selectHtml = buildReactSelectInnerHtml({
      selectAttrs,
      disabledClass,
      tokenStyle,
      placeholderSegment,
      optionsCode
    });

    return this.buildLabeledFieldBlock(
      label,
      selectHtml,
      `      <div key={${key}} className="mb-4">`,
      '      </div>',
      safeLabel => `        <label className="block text-sm font-medium text-gray-700 mb-2">${safeLabel}</label>`
    );
  }

  private renderDatePicker(props: DatePickerComponent, key: number): string {
    const { label, name = 'date', required = false, disabled = false, min, max, value, token } = props;
    const disabledClass = this.getDisabledClass(disabled);
    const tokenStyle = this.getReactTokenStyleInline('DatePicker', token);

    const dateInputAttrs = this.buildAttrs({
      required,
      disabled,
      min,
      max,
      defaultValue: value
    });

    const dateInputHtml = buildReactDateInputInnerHtml({
      name,
      dateInputAttrs,
      disabledClass,
      tokenStyle
    });

    return this.buildLabeledFieldBlock(
      label,
      dateInputHtml,
      `      <div key={${key}} className="textui-datepicker mb-4">`,
      '      </div>',
      safeLabel => `        <label htmlFor="${name}" className="block text-sm font-medium text-gray-700 mb-2 textui-text">${safeLabel}</label>`
    );
  }

  private renderDivider(props: DividerComponent, key: number): string {
    const styleManager = this.getStyleManager();
    const tokenStyle = this.getReactTokenStyleInline('Divider', props.token);
    return renderDividerTemplate(props, key, tokenStyle, styleManager, this.format);
  }

  private renderSpacer(props: SpacerComponent, key: number): string {
    const { width: resolvedWidth, height: resolvedHeight } = this.resolveSpacerDimensions(props);
    return renderSpacerTemplate(key, resolvedWidth, resolvedHeight);
  }

  private renderAlert(props: AlertComponent, key: number): string {
    const styleManager = this.getStyleManager();
    const tokenStyle = this.getReactTokenStyleInline('Alert', props.token);
    return renderAlertTemplate(props, key, tokenStyle, styleManager, this.format);
  }

  private renderAccordion(props: AccordionComponent, key: number): string {
    const tokenStyle = this.getReactTokenStyleInline('Accordion', props.token);
    return renderAccordionTemplate(props, key, tokenStyle, {
      renderComponent: (component, componentKey) => this.renderComponent(component, componentKey),
      adjustIndentation: (source, indent) => this.adjustIndentation(source, indent),
      toTableCellText: value => this.toTableCellText(value)
    });
  }

  private renderTabs(props: TabsComponent, key: number): string {
    const tokenStyle = this.getReactTokenStyleInline('Tabs', props.token);
    return renderTabsTemplate(props, key, tokenStyle, (defaultTab, length) => this.resolveActiveTabIndex(defaultTab ?? 0, length), {
      renderComponent: (component, componentKey) => this.renderComponent(component, componentKey),
      adjustIndentation: (source, indent) => this.adjustIndentation(source, indent),
      toTableCellText: value => this.toTableCellText(value)
    });
  }

  private renderTreeView(props: TreeViewComponent, key: number): string {
    const tokenStyle = this.getReactTokenStyleInline('TreeView', props.token);
    return renderTreeViewTemplate(props, key, tokenStyle, {
      renderComponent: (component, componentKey) => this.renderComponent(component, componentKey),
      adjustIndentation: (source, indent) => this.adjustIndentation(source, indent),
      toTableCellText: value => this.toTableCellText(value)
    });
  }

  private renderTable(props: TableComponent, key: number): string {
    const tokenStyle = this.getReactTokenStyleInline('Table', props.token);
    return renderTableTemplate(props, key, tokenStyle, {
      renderComponent: (component, componentKey) => this.renderComponent(component, componentKey),
      adjustIndentation: (source, indent) => this.adjustIndentation(source, indent),
      toTableCellText: value => this.toTableCellText(value)
    });
  }

  private renderLink(props: LinkComponent, key: number): string {
    const tokenStyle = this.getReactTokenStyleInline('Link', props.token);
    return renderLinkTemplate(props, key, tokenStyle);
  }

  private renderBreadcrumb(props: BreadcrumbComponent, key: number): string {
    const tokenStyle = this.getReactTokenStyleInline('Breadcrumb', props.token);
    return renderBreadcrumbTemplate(props, key, tokenStyle);
  }

  private renderBadge(props: BadgeComponent, key: number): string {
    const tokenStyle = this.getReactTokenStyleInline('Badge', props.token);
    return renderBadgeTemplate(props, key, tokenStyle);
  }

  private renderProgress(props: ProgressComponent, key: number): string {
    return renderProgressTemplate(props, key);
  }

  private renderImage(props: ImageComponent, key: number): string {
    const tokenStyle = this.getReactTokenStyleInline('Image', props.token);
    return renderImageTemplate(props, key, tokenStyle);
  }

  private renderIcon(props: IconComponent, key: number): string {
    const tokenStyle = this.getReactTokenStyleInline('Icon', props.token);
    return renderIconTemplate(props, key, tokenStyle);
  }

  private renderModal(props: ModalComponent, key: number): string {
    const { title, open = true, body, actions, token } = props;
    if (!open) {
      return '';
    }

    const tokenStyle = this.getReactTokenStyleInline('Modal', token);
    const safeTitle = title ? JSON.stringify(title) : undefined;
    const safeBody = body ? JSON.stringify(body) : undefined;
    const actionKindClass: Record<'primary' | 'secondary' | 'danger' | 'ghost', string> = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-700 hover:bg-gray-600 text-gray-300',
      danger: 'bg-red-600 hover:bg-red-700 text-white',
      ghost: 'bg-transparent border border-gray-500 text-gray-300 hover:bg-gray-700/30',
    };

    const actionCode = (actions && actions.length > 0)
      ? actions.map((action, index) => {
          const kind = action.kind ?? 'secondary';
          const className = actionKindClass[kind] ?? actionKindClass.secondary;
          return `          <button
            key={${index}}
            type="button"
            className="textui-modal-action inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${className} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <span className="textui-button-label">{${JSON.stringify(action.label ?? '')}}</span>
          </button>`;
        }).join('\n')
      : '';

    return `      <div key={${key}} className="textui-modal max-w-2xl mb-4"${tokenStyle}>
        <div className="textui-modal-surface bg-gray-800 border border-gray-600 rounded-lg overflow-hidden shadow-2xl">
${safeTitle ? `          <div className="textui-modal-header px-5 pt-4 pb-3 border-b border-gray-700">
            <span className="textui-modal-title text-base font-semibold text-gray-100">{${safeTitle}}</span>
          </div>` : ''}
${safeBody ? `          <div className="textui-modal-body px-5 py-4 text-sm text-gray-300 whitespace-pre-line">{${safeBody}}</div>` : ''}
${actionCode ? `          <div className="textui-modal-footer flex justify-end gap-2 px-5 py-3 border-t border-gray-700">
${actionCode}
          </div>` : ''}
        </div>
      </div>`;
  }

  private renderContainer(props: ContainerComponent, key: number): string {
    const tokenStyle = this.getReactTokenStyleInline('Container', props.token, props.tokenSlots);
    return renderContainerTemplate(props, key, tokenStyle, {
      renderComponent: (component, componentKey) => this.renderComponent(component, componentKey),
      adjustIndentation: (source, indent) => this.adjustIndentation(source, indent),
      toTableCellText: value => this.toTableCellText(value)
    });
  }

  private renderForm(props: FormComponent, key: number): string {
    const tokenStyle = this.getReactTokenStyleInline('Form', props.token);
    return renderFormTemplate(
      props,
      key,
      tokenStyle,
      (field, index) => this.renderFormField(field, index),
      (action, index) => this.renderFormAction(action, index)
    );
  }
}
