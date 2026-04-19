import * as fs from 'fs';
import * as path from 'path';
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
  TableComponent,
  LinkComponent,
  BreadcrumbComponent,
  BadgeComponent,
  ProgressComponent,
  ImageComponent,
  IconComponent,
  ModalComponent
} from '../domain/dsl-types';
import type { ExportOptions } from './export-types';
import { BaseComponentRenderer } from './legacy/base-component-renderer';
import { buildHtmlDocument, readWebviewCssIfPresent } from './html-template-builder';
import { renderPageComponentsToStaticHtml } from './react-static-export';
import { buildThemeStyleBlock } from './theme-style-builder';
import { buildThemeVariables } from './theme-definition-resolver';
import { ThemeUtils } from '../theme/theme-utils';
import { HtmlFormRenderer } from './legacy/html-renderers/html-form-renderer';
import { HtmlTextualRenderer } from './legacy/html-renderers/html-textual-renderer';
import { HtmlLayoutRenderer } from './legacy/html-renderers/html-layout-renderer';
import type { HtmlRendererUtils } from './legacy/html-renderers/html-renderer-utils';
import { resolveImageSourcesInDsl } from '../utils/image-source-resolver';
/**
 * HTML 形式へのエクスポート。
 *
 * **Primary path（唯一）**: `ExportOptions.useReactRender` が **省略または true** のとき。
 * `renderPageComponentsToStaticHtml`（React コンポーネントの静的 HTML 化）でページ本体を生成し、
 * `buildHtmlDocument(..., { noWrap: true })` でラップする。WebView プレビューと同系統の見た目を目指す経路。
 *
 * **`useReactRender === false` は廃止**（T-20260420-001）。文字列レンダラ互換レーンは削除済み。
 *
 * 運用の一覧は `docs/current/runtime-boundaries/exporter-boundary-guide.md` の「HtmlExporter」の節を参照。
 */
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
    const normalizedDsl = this.resolveLocalImageSourcesForExport(dsl, options);
    let themeStyles = this.buildThemeStyles(options.themePath);
    const webviewCss = readWebviewCssIfPresent(options.extensionPath);
    // テーマ未指定かつ webviewCss 使用時は WebView のデフォルトと同じ theme-vars を注入する
    if (!themeStyles && webviewCss) {
      themeStyles = ThemeUtils.getDefaultThemeCssVariables();
    }

    const useReact = options.useReactRender !== false;
    if (!useReact) {
      throw new Error(
        '[HtmlExporter:FALLBACK_REMOVED] The string-renderer compatibility lane was removed (T-20260420-001). Use Primary export: omit useReactRender or set useReactRender: true. See docs/current/theme-export-rendering/t038-fallback-removal-pr-gate.md §2.'
      );
    }

    const components = normalizedDsl.page?.components ?? [];
    const reactBody = renderPageComponentsToStaticHtml(components);
    return buildHtmlDocument(reactBody, themeStyles, {
      webviewCss: webviewCss ?? undefined,
      noWrap: true
    });
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

  protected renderLink(props: LinkComponent, _key: number): string {
    return this.textualRenderer.renderLink(props);
  }

  protected renderBreadcrumb(props: BreadcrumbComponent, _key: number): string {
    return this.textualRenderer.renderBreadcrumb(props);
  }

  protected renderBadge(props: BadgeComponent, _key: number): string {
    return this.textualRenderer.renderBadge(props);
  }

  protected renderProgress(props: ProgressComponent, _key: number): string {
    return this.textualRenderer.renderProgress(props);
  }

  protected renderImage(props: ImageComponent, _key: number): string {
    return this.textualRenderer.renderImage(props);
  }

  protected renderIcon(props: IconComponent, _key: number): string {
    return this.textualRenderer.renderIcon(props);
  }

  protected renderModal(props: ModalComponent, _key: number): string {
    const { title, open = true, body, actions, token } = props;
    if (!open) {
      return '';
    }
    const tokenStyle = this.getHtmlTokenStyleAttr('Modal', token);
    const safeTitle = title ? this.escapeHtml(title) : '';
    const safeBody = body ? this.escapeHtml(body) : '';

    const actionKindStyle: Record<string, string> = {
      primary: 'background-color:#3b82f6;color:#fff;border:none;',
      secondary: 'background-color:rgba(107,114,128,0.25);color:#d1d5db;border:1px solid rgba(107,114,128,0.4);',
      danger: 'background-color:#ef4444;color:#fff;border:none;',
      ghost: 'background-color:transparent;color:#d1d5db;border:1px solid rgba(107,114,128,0.3);'
    };

    let html = `    <div class="textui-modal" style="max-width:32rem;margin-bottom:1rem;"${tokenStyle}>\n`;
    html += `      <div style="background-color:rgb(31 41 55);border:1px solid rgb(75 85 99);border-radius:0.5rem;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);">\n`;
    if (safeTitle) {
      html += `        <div class="textui-modal-header" style="padding:1rem 1.25rem 0.75rem;border-bottom:1px solid rgb(55 65 81);">\n`;
      html += `          <span class="textui-modal-title" style="font-size:1rem;font-weight:600;color:rgb(243 244 246);">${safeTitle}</span>\n`;
      html += `        </div>\n`;
    }
    if (safeBody) {
      html += `        <div class="textui-modal-body" style="padding:1rem 1.25rem;font-size:0.875rem;color:rgb(209 213 219);">${safeBody}</div>\n`;
    }
    if (actions && actions.length > 0) {
      html += `        <div class="textui-modal-footer" style="display:flex;justify-content:flex-end;gap:0.5rem;padding:0.75rem 1.25rem;border-top:1px solid rgb(55 65 81);">\n`;
      for (const action of actions) {
        const kind = action.kind ?? 'secondary';
        const style = actionKindStyle[kind] ?? actionKindStyle.secondary;
        const safeLabel = this.escapeHtml(action.label ?? '');
        html += `          <button style="padding:0.375rem 0.875rem;border-radius:0.375rem;font-size:0.875rem;font-weight:500;cursor:default;${style}">${safeLabel}</button>\n`;
      }
      html += `        </div>\n`;
    }
    html += `      </div>\n`;
    html += `    </div>`;
    return html;
  }

  private createRendererUtils(): HtmlRendererUtils {
    return {
      escapeHtml: value => this.escapeHtml(value),
      escapeAttribute: value => this.escapeAttribute(value),
      getDisabledClass: (disabled = false) => this.getDisabledClass(disabled),
      getHtmlTokenStyleAttr: (componentType, token, tokenSlots) => this.getHtmlTokenStyleAttr(componentType, token, tokenSlots),
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

  private resolveLocalImageSourcesForExport(dsl: TextUIDSL, options: ExportOptions): TextUIDSL {
    if (!options.outputPath || !options.sourcePath) {
      return dsl;
    }

    const outputDir = path.dirname(options.outputPath);
    const imagesDir = path.join(outputDir, 'images');

    return resolveImageSourcesInDsl(dsl, {
      dslFileDir: path.dirname(options.sourcePath),
      mapResolvedSrc: (absolutePath, originalSrc) => {
        try {
          if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
          }

          const fileName = path.basename(absolutePath);
          const targetPath = path.join(imagesDir, fileName);
          fs.copyFileSync(absolutePath, targetPath);

          return path.posix.join('images', fileName);
        } catch (error) {
          console.warn(`[HtmlExporter] 画像ファイルのコピーに失敗しました: ${absolutePath} (${error instanceof Error ? error.message : String(error)})`);
          return originalSrc;
        }
      }
    });
  }
}
