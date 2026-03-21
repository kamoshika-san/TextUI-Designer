import type {
  TextUIDSL, FormComponent,
  TextComponent, InputComponent, ButtonComponent, CheckboxComponent,
  RadioComponent, SelectComponent, DatePickerComponent, DividerComponent, SpacerComponent, AlertComponent,
  ContainerComponent, AccordionComponent, TabsComponent, TreeViewComponent, TableComponent, LinkComponent, BreadcrumbComponent, BadgeComponent, ProgressComponent, ImageComponent, IconComponent
} from '../domain/dsl-types';
import type { ExportOptions } from './export-types';
import { BaseComponentRenderer } from './base-component-renderer';
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
    const tokenStyle = this.getReactTokenStyleInline('Text', props.token);
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
      safeLabel => `        <label className="block text-sm font-medium text-gray-700 mb-2">${safeLabel}</label>`
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
      safeLabel => `        <label className="ml-2 block text-sm text-gray-900">${safeLabel}</label>`
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
      `      <div key={${key}} className="flex items-center mb-4">`,
      '      </div>',
      safeLabel => `        <label className="ml-2 block text-sm text-gray-900">${safeLabel}</label>`
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
      `      <div key={${key}} className="mb-4">`,
      '      </div>',
      safeLabel => `        <label htmlFor="${name}" className="block text-sm font-medium text-gray-700 mb-2">${safeLabel}</label>`
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

  protected renderContainer(props: ContainerComponent, key: number): string {
    const tokenStyle = this.getReactTokenStyleInline('Container', props.token);
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
