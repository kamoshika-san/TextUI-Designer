import type {
  TextUIDSL, FormComponent,
  TextComponent, InputComponent, ButtonComponent, CheckboxComponent,
  RadioComponent, SelectComponent, DatePickerComponent, DividerComponent, SpacerComponent, AlertComponent,
  ContainerComponent, AccordionComponent, TabsComponent, TreeViewComponent, TableComponent, LinkComponent, BreadcrumbComponent, BadgeComponent, ProgressComponent, ImageComponent, IconComponent, ModalComponent
} from '../domain/dsl-types';
import type { ExportOptions } from './export-types';
import { BaseComponentRenderer } from './legacy/base-component-renderer';
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

export class ReactExporter extends BaseComponentRenderer {
  constructor() {
    super('react');
  }

  async export(dsl: TextUIDSL, _options: ExportOptions): Promise<string> {
    const componentCode = this.renderPageComponents(dsl, '\n\n');
    return buildReactPageDocument(componentCode);
  }

  getFileExtension(): string {
    return '.tsx';
  }

  protected renderText(props: TextComponent, key: number): string {
    const styleManager = this.getStyleManager();
    const tokenStyle = this.getReactTokenStyleInline('Text', props.token, props.tokenSlots);
    return renderTextTemplate(props, key, tokenStyle, styleManager, this.format);
  }

  protected renderInput(props: InputComponent, key: number): string {
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

  protected renderButton(props: ButtonComponent, key: number): string {
    const styleManager = this.getStyleManager();
    const tokenStyle = this.getReactTokenStyleInline('Button', props.token);
    return renderButtonTemplate(props, key, tokenStyle, styleManager, this.format);
  }

  protected renderCheckbox(props: CheckboxComponent, key: number): string {
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

  protected renderRadio(props: RadioComponent, key: number): string {
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

  protected renderSelect(props: SelectComponent, key: number): string {
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

  protected renderDatePicker(props: DatePickerComponent, key: number): string {
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

  protected renderDivider(props: DividerComponent, key: number): string {
    const styleManager = this.getStyleManager();
    const tokenStyle = this.getReactTokenStyleInline('Divider', props.token);
    return renderDividerTemplate(props, key, tokenStyle, styleManager, this.format);
  }

  protected renderSpacer(props: SpacerComponent, key: number): string {
    const { width: resolvedWidth, height: resolvedHeight } = this.resolveSpacerDimensions(props);
    return renderSpacerTemplate(key, resolvedWidth, resolvedHeight);
  }

  protected renderAlert(props: AlertComponent, key: number): string {
    const styleManager = this.getStyleManager();
    const tokenStyle = this.getReactTokenStyleInline('Alert', props.token);
    return renderAlertTemplate(props, key, tokenStyle, styleManager, this.format);
  }

  protected renderAccordion(props: AccordionComponent, key: number): string {
    const tokenStyle = this.getReactTokenStyleInline('Accordion', props.token);
    return renderAccordionTemplate(props, key, tokenStyle, {
      renderComponent: (component, componentKey) => this.renderComponent(component, componentKey),
      adjustIndentation: (source, indent) => this.adjustIndentation(source, indent),
      toTableCellText: value => this.toTableCellText(value)
    });
  }

  protected renderTabs(props: TabsComponent, key: number): string {
    const tokenStyle = this.getReactTokenStyleInline('Tabs', props.token);
    return renderTabsTemplate(props, key, tokenStyle, (defaultTab, length) => this.resolveActiveTabIndex(defaultTab ?? 0, length), {
      renderComponent: (component, componentKey) => this.renderComponent(component, componentKey),
      adjustIndentation: (source, indent) => this.adjustIndentation(source, indent),
      toTableCellText: value => this.toTableCellText(value)
    });
  }

  protected renderTreeView(props: TreeViewComponent, key: number): string {
    const tokenStyle = this.getReactTokenStyleInline('TreeView', props.token);
    return renderTreeViewTemplate(props, key, tokenStyle, {
      renderComponent: (component, componentKey) => this.renderComponent(component, componentKey),
      adjustIndentation: (source, indent) => this.adjustIndentation(source, indent),
      toTableCellText: value => this.toTableCellText(value)
    });
  }

  protected renderTable(props: TableComponent, key: number): string {
    const tokenStyle = this.getReactTokenStyleInline('Table', props.token);
    return renderTableTemplate(props, key, tokenStyle, {
      renderComponent: (component, componentKey) => this.renderComponent(component, componentKey),
      adjustIndentation: (source, indent) => this.adjustIndentation(source, indent),
      toTableCellText: value => this.toTableCellText(value)
    });
  }

  protected renderLink(props: LinkComponent, key: number): string {
    const tokenStyle = this.getReactTokenStyleInline('Link', props.token);
    return renderLinkTemplate(props, key, tokenStyle);
  }

  protected renderBreadcrumb(props: BreadcrumbComponent, key: number): string {
    const tokenStyle = this.getReactTokenStyleInline('Breadcrumb', props.token);
    return renderBreadcrumbTemplate(props, key, tokenStyle);
  }

  protected renderBadge(props: BadgeComponent, key: number): string {
    const tokenStyle = this.getReactTokenStyleInline('Badge', props.token);
    return renderBadgeTemplate(props, key, tokenStyle);
  }

  protected renderProgress(props: ProgressComponent, key: number): string {
    return renderProgressTemplate(props, key);
  }

  protected renderImage(props: ImageComponent, key: number): string {
    const tokenStyle = this.getReactTokenStyleInline('Image', props.token);
    return renderImageTemplate(props, key, tokenStyle);
  }

  protected renderIcon(props: IconComponent, key: number): string {
    const tokenStyle = this.getReactTokenStyleInline('Icon', props.token);
    return renderIconTemplate(props, key, tokenStyle);
  }

  protected renderModal(props: ModalComponent, key: number): string {
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

  protected renderContainer(props: ContainerComponent, key: number): string {
    const tokenStyle = this.getReactTokenStyleInline('Container', props.token, props.tokenSlots);
    return renderContainerTemplate(props, key, tokenStyle, {
      renderComponent: (component, componentKey) => this.renderComponent(component, componentKey),
      adjustIndentation: (source, indent) => this.adjustIndentation(source, indent),
      toTableCellText: value => this.toTableCellText(value)
    });
  }

  protected renderForm(props: FormComponent, key: number): string {
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
