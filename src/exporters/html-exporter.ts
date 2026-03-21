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
  IconComponent
} from '../domain/dsl-types';
import type { ExportOptions } from './export-types';
import { BaseComponentRenderer } from './base-component-renderer';
import { buildHtmlDocument, readWebviewCssIfPresent } from './html-template-builder';
import { renderPageComponentsToStaticHtml } from './react-static-export';
import { buildThemeStyleBlock } from './theme-style-builder';
import { buildThemeVariables } from './theme-definition-resolver';
import { ThemeUtils } from '../theme/theme-utils';
import { HtmlFormRenderer } from './html-renderers/html-form-renderer';
import { HtmlTextualRenderer } from './html-renderers/html-textual-renderer';
import { HtmlLayoutRenderer } from './html-renderers/html-layout-renderer';
import type { HtmlRendererUtils } from './html-renderers/html-renderer-utils';
import { resolveImageSourcesInDsl } from '../utils/image-source-resolver';

/**
 * HTML 形式へのエクスポート。
 *
 * **Primary path（既定）**: `ExportOptions.useReactRender !== false` のとき。
 * `renderPageComponentsToStaticHtml`（React コンポーネントの静的 HTML 化）でページ本体を生成し、
 * `buildHtmlDocument(..., { noWrap: true })` でラップする。WebView プレビューと同系統の見た目を目指す経路。
 *
 * **Fallback path**: `useReactRender === false` のときのみ。
 * `renderPageComponents`（本クラス継承の文字列ベース HTML レンダラ群）を使用。
 * テストの安定化や capture 等で明示的に切り替える。挙動差・コンポーネント対応差が残りうるため、
 * **不具合修正・新コンポーネント対応は通常 primary 側を正とする**（fallback は縮小・削除は別チケット）。
 *
 * 運用の一覧は `docs/exporter-boundary-guide.md` の「HtmlExporter」の節を参照。
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

    // Primary: WebView と同じ React 静的レンダー ＋ webviewCss（既定）
    const useReact = options.useReactRender !== false;
    if (useReact) {
      const components = normalizedDsl.page?.components ?? [];
      const reactBody = renderPageComponentsToStaticHtml(components);
      return buildHtmlDocument(reactBody, themeStyles, {
        webviewCss: webviewCss ?? undefined,
        noWrap: true
      });
    }

    // Fallback: 文字列レンダー（useReactRender: false のときのみ。テスト・capture 等）
    const componentCode = this.renderPageComponents(normalizedDsl);
    return buildHtmlDocument(componentCode, themeStyles, {
      webviewCss: webviewCss ?? undefined
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
