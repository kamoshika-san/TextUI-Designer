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
import { BaseComponentRenderer } from './base-component-renderer';
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

  // TODO T-20260330-303: implement full Modal Pug output
  protected renderModal(_props: ModalComponent, _key: number): string {
    return '';
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
