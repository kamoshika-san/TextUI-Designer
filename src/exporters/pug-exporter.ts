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
  FormComponent
} from '../domain/dsl-types';
import type { ExportOptions } from './export-types';
import { BaseComponentRenderer } from './legacy/base-component-renderer';
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

export class PugExporter extends BaseComponentRenderer {
  constructor() {
    super('pug');
  }

  async export(dsl: TextUIDSL, _options: ExportOptions): Promise<string> {
    const componentCode = this.renderPageComponents(dsl);
    return buildPugPageDocument(componentCode);
  }

  getFileExtension(): string {
    return '.pug';
  }

  protected renderText(props: TextComponent, _key: number): string {
    return renderPugText(props, this.getStyleManager(), this.format, this.getPugTokenStyleSuffix('Text', props.token));
  }

  protected renderInput(props: InputComponent, _key: number): string {
    const { required = false, disabled = false, token } = props;
    return renderPugInput(props, {
      disabledClass: this.getDisabledClass(disabled),
      tokenStyle: this.getPugTokenStyleSuffix('Input', token),
      inputAttrs: this.buildAttrs({ required, disabled }),
      buildLabeledFieldBlock: this.buildLabeledFieldBlock.bind(this)
    });
  }

  protected renderButton(props: ButtonComponent, _key: number): string {
    const { disabled = false, token } = props;
    return renderPugButton(props, this.getStyleManager(), this.format, {
      disabledClass: this.getDisabledClass(disabled),
      disabledAttr: disabled ? 'disabled' : '',
      tokenStyle: this.getPugTokenStyleSuffix('Button', token),
      escapeHtml: this.escapeHtml.bind(this)
    });
  }

  protected renderCheckbox(props: CheckboxComponent, _key: number): string {
    const { checked = false, disabled = false, token } = props;
    return renderPugCheckbox(props, {
      disabledClass: this.getDisabledClass(disabled),
      tokenStyle: this.getPugTokenStyleSuffix('Checkbox', token),
      checkboxAttrs: this.buildAttrs({ checked, disabled }),
      buildControlRowWithLabel: this.buildControlRowWithLabel.bind(this)
    });
  }

  protected renderRadio(props: RadioComponent, _key: number): string {
    const { checked = false, disabled = false, token } = props;
    return renderPugRadio(props, {
      disabledClass: this.getDisabledClass(disabled),
      tokenStyle: this.getPugTokenStyleSuffix('Radio', token),
      radioAttrs: this.buildAttrs({ checked, disabled }),
      buildControlRowWithLabel: this.buildControlRowWithLabel.bind(this)
    });
  }

  protected renderSelect(props: SelectComponent, _key: number): string {
    const { disabled = false, token } = props;
    return renderPugSelect(props, {
      disabledClass: this.getDisabledClass(disabled),
      tokenStyle: this.getPugTokenStyleSuffix('Select', token),
      selectAttrs: this.buildAttrs({ disabled }),
      buildLabeledFieldBlock: this.buildLabeledFieldBlock.bind(this)
    });
  }

  protected renderDatePicker(props: DatePickerComponent, _key: number): string {
    const { required = false, disabled = false, min, max, value, token } = props;
    return renderPugDatePicker(props, {
      disabledClass: this.getDisabledClass(disabled),
      tokenStyle: this.getPugTokenStyleSuffix('DatePicker', token),
      dateInputAttrs: this.buildAttrs({ required, disabled, min, max, value }),
      buildLabeledFieldBlock: this.buildLabeledFieldBlock.bind(this)
    });
  }

  protected renderDivider(props: DividerComponent, _key: number): string {
    const { token } = props;
    return renderPugDivider(
      props,
      this.getStyleManager(),
      this.format,
      this.getPugTokenStyleSuffix('Divider', token),
      this.getPugTokenStyleModifier('Divider', token)
    );
  }

  protected renderSpacer(props: SpacerComponent, _key: number): string {
    const { width: resolvedWidth, height: resolvedHeight } = this.resolveSpacerDimensions(props);
    return renderPugSpacer(resolvedWidth, resolvedHeight);
  }

  protected renderAlert(props: AlertComponent, _key: number): string {
    const { token } = props;
    return renderPugAlert(props, this.getStyleManager(), this.format, this.getPugTokenStyleSuffix('Alert', token));
  }

  protected renderBadge(props: BadgeComponent, _key: number): string {
    const { token } = props;
    return renderPugBadge(props, this.escapeHtml.bind(this), this.escapeAttribute.bind(this), this.getPugTokenStyleSuffix('Badge', token));
  }

  protected renderProgress(props: ProgressComponent, _key: number): string {
    return renderPugProgress(props, this.escapeHtml.bind(this), this.escapeAttribute.bind(this));
  }

  protected renderImage(props: ImageComponent, _key: number): string {
    const { token } = props;
    return renderPugImage(props, this.escapeAttribute.bind(this), this.getPugTokenStyleSuffix('Image', token));
  }

  protected renderIcon(props: IconComponent, _key: number): string {
    const { token } = props;
    return renderPugIcon(props, this.escapeHtml.bind(this), this.escapeAttribute.bind(this), this.getPugTokenStyleSuffix('Icon', token));
  }

  protected renderModal(props: ModalComponent, _key: number): string {
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

  protected renderLink(props: LinkComponent, _key: number): string {
    const { token } = props;
    return renderPugLink(props, this.escapeHtml.bind(this), this.escapeAttribute.bind(this), this.getPugTokenStyleSuffix('Link', token));
  }

  protected renderBreadcrumb(props: BreadcrumbComponent, _key: number): string {
    const { token } = props;
    return renderPugBreadcrumb(props, {
      tokenStyleModifier: this.getPugTokenStyleModifier('Breadcrumb', token),
      escapeHtml: this.escapeHtml.bind(this),
      escapeAttribute: this.escapeAttribute.bind(this)
    });
  }

  protected renderAccordion(props: AccordionComponent, _key: number): string {
    const { token } = props;
    return renderPugAccordion(props, {
      tokenStyle: this.getPugTokenStyleSuffix('Accordion', token),
      renderComponent: this.renderComponent.bind(this),
      adjustIndentation: this.adjustIndentation.bind(this)
    });
  }

  protected renderTabs(props: TabsComponent, _key: number): string {
    const { token } = props;
    return renderPugTabs(props, {
      tokenStyleModifier: this.getPugTokenStyleModifier('Tabs', token),
      resolveActiveTabIndex: this.resolveActiveTabIndex.bind(this),
      renderComponent: this.renderComponent.bind(this),
      adjustIndentation: this.adjustIndentation.bind(this)
    });
  }

  protected renderTreeView(props: TreeViewComponent, key: number): string {
    const { token } = props;
    return renderPugTreeView(props, key, {
      tokenStyleModifier: this.getPugTokenStyleModifier('TreeView', token),
      renderComponent: this.renderComponent.bind(this),
      renderAst: this.renderAst.bind(this)
    });
  }

  protected renderTable(props: TableComponent, _key: number): string {
    const { token } = props;
    return renderPugTable(props, {
      tokenStyleModifier: this.getPugTokenStyleModifier('Table', token),
      escapeAttribute: this.escapeAttribute.bind(this),
      toTableCellText: this.toTableCellText.bind(this),
      renderComponent: this.renderComponent.bind(this),
      adjustIndentation: this.adjustIndentation.bind(this)
    });
  }

  protected renderContainer(props: ContainerComponent, _key: number): string {
    const { token } = props;
    return renderPugContainer(props, {
      tokenStyleModifier: this.getPugTokenStyleModifier('Container', token),
      escapeAttribute: this.escapeAttribute.bind(this),
      renderComponent: this.renderComponent.bind(this),
      adjustIndentation: this.adjustIndentation.bind(this)
    });
  }

  protected renderForm(props: FormComponent, _key: number): string {
    const { token } = props;
    return renderPugForm(props, {
      tokenStyle: this.getPugTokenStyleSuffix('Form', token),
      renderFormField: this.renderFormField.bind(this),
      renderFormAction: this.renderFormAction.bind(this),
      adjustIndentation: this.adjustIndentation.bind(this)
    });
  }
}
