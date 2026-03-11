import type {
  TextUIDSL,
  FormComponent,
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
  TableComponent
} from '../renderer/types';
import type { ExportOptions } from './index';
import { BaseComponentRenderer } from './base-component-renderer';
import { buildHtmlDocument } from './html-template-builder';
import { buildThemeStyleBlock } from './theme-style-builder';
import { buildThemeVariables } from './theme-definition-resolver';
import { HtmlFormRenderer } from './html-renderers/html-form-renderer';
import { HtmlTextualRenderer } from './html-renderers/html-textual-renderer';
import { HtmlLayoutRenderer } from './html-renderers/html-layout-renderer';
import type { HtmlRendererUtils } from './html-renderers/html-renderer-utils';

export class HtmlExporter extends BaseComponentRenderer {
  private readonly formRenderer: HtmlFormRenderer;
  private readonly textualRenderer: HtmlTextualRenderer;
  private readonly layoutRenderer: HtmlLayoutRenderer;

  constructor() {
    super('html');

    const utils = this.createRendererUtils();
    this.formRenderer = new HtmlFormRenderer(utils);
    this.textualRenderer = new HtmlTextualRenderer(utils);
    this.layoutRenderer = new HtmlLayoutRenderer(utils);
  }

  async export(dsl: TextUIDSL, options: ExportOptions): Promise<string> {
    const componentCode = this.renderPageComponents(dsl);
    const themeStyles = this.buildThemeStyles(options.themePath);

    return buildHtmlDocument(componentCode, themeStyles);
  }

  getFileExtension(): string {
    return '.html';
  }

  protected renderText(props: TextComponent, _key: number): string {
    return this.textualRenderer.renderText(props);
  }

  protected renderInput(props: InputComponent, _key: number): string {
    return this.formRenderer.renderInput(props);
  }

  protected renderButton(props: ButtonComponent, _key: number): string {
    return this.formRenderer.renderButton(props);
  }

  protected renderCheckbox(props: CheckboxComponent, _key: number): string {
    return this.formRenderer.renderCheckbox(props);
  }

  protected renderRadio(props: RadioComponent, _key: number): string {
    return this.formRenderer.renderRadio(props);
  }

  protected renderSelect(props: SelectComponent, _key: number): string {
    return this.formRenderer.renderSelect(props);
  }

  protected renderDatePicker(props: DatePickerComponent, _key: number): string {
    return this.formRenderer.renderDatePicker(props);
  }

  protected renderDivider(props: DividerComponent, _key: number): string {
    return this.textualRenderer.renderDivider(props);
  }

  protected renderSpacer(props: SpacerComponent, _key: number): string {
    return this.textualRenderer.renderSpacer(props);
  }

  protected renderAlert(props: AlertComponent, _key: number): string {
    return this.textualRenderer.renderAlert(props);
  }

  protected renderContainer(props: ContainerComponent, _key: number): string {
    return this.layoutRenderer.renderContainer(props);
  }

  protected renderForm(props: FormComponent, _key: number): string {
    return this.formRenderer.renderForm(props);
  }

  protected renderAccordion(props: AccordionComponent, _key: number): string {
    return this.layoutRenderer.renderAccordion(props);
  }

  protected renderTabs(props: TabsComponent, key: number): string {
    return this.layoutRenderer.renderTabs(props, key);
  }

  protected renderTreeView(props: TreeViewComponent, key: number): string {
    return this.layoutRenderer.renderTreeView(props, key);
  }

  protected renderTable(props: TableComponent, _key: number): string {
    return this.layoutRenderer.renderTable(props);
  }

  private createRendererUtils(): HtmlRendererUtils {
    return {
      escapeHtml: value => this.escapeHtml(value),
      escapeAttribute: value => this.escapeAttribute(value),
      getDisabledClass: (disabled = false) => this.getDisabledClass(disabled),
      getHtmlTokenStyleAttr: (componentType, token) => this.getHtmlTokenStyleAttr(componentType, token),
      getStyleManager: () => this.getStyleManager(),
      buildAttrs: attrs => this.buildAttrs(attrs),
      buildLabeledFieldBlock: (
        label,
        fieldContent,
        wrapperStart,
        wrapperEnd,
        buildLabelLine
      ) => this.buildLabeledFieldBlock(label, fieldContent, wrapperStart, wrapperEnd, buildLabelLine),
      buildControlRowWithLabel: (
        label,
        controlContent,
        rowStart,
        rowEnd,
        buildLabelLine
      ) => this.buildControlRowWithLabel(label, controlContent, rowStart, rowEnd, buildLabelLine),
      resolveSpacerDimensions: props => this.resolveSpacerDimensions(props),
      renderComponent: (component, key) => this.renderComponent(component, key),
      renderFormField: (field, index) => this.renderFormField(field, index),
      renderFormAction: (action, index) => this.renderFormAction(action, index),
      resolveActiveTabIndex: (defaultTab, itemCount) => this.resolveActiveTabIndex(defaultTab, itemCount),
      toTableCellText: value => this.toTableCellText(value)
    };
  }

  private buildThemeStyles(themePath?: string): string {
    if (!themePath) {
      return '';
    }

    try {
      const allVars = buildThemeVariables(themePath);
      return buildThemeStyleBlock(allVars);
    } catch (error) {
      console.warn(`[HtmlExporter] テーマ読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
      return '';
    }
  }
}
