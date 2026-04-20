import * as fs from 'fs';
import * as path from 'path';
import type { TextUIDSL, NavigationFlowDSL } from '../domain/dsl-types';
import { isNavigationFlowDSL } from '../domain/dsl-types';
import type { ExportOptions, Exporter } from './export-types';
import { buildHtmlDocument, readWebviewCssIfPresent } from './html-template-builder';
import { renderPageComponentsToStaticHtml } from './react-static-export';
import { buildThemeStyleBlock } from './theme-style-builder';
import { buildThemeVariables } from './theme-definition-resolver';
import { ThemeUtils } from '../theme/theme-utils';
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
 * **構造**: `BaseComponentRenderer` および `legacy/html-renderers/*` には依存しない（Vault **T-20260421-022** / **T-023**）。
 *
 * 運用の一覧は `docs/current/runtime-boundaries/exporter-boundary-guide.md` の「HtmlExporter」の節を参照。
 */
export class HtmlExporter implements Exporter {
  async export(dsl: TextUIDSL | NavigationFlowDSL, options: ExportOptions): Promise<string> {
    if (isNavigationFlowDSL(dsl)) {
      throw new Error(
        '[HtmlExporter] format `html` expects a TextUIDSL page document. Use `html-flow` for navigation flow DSLs.'
      );
    }

    const normalizedDsl = this.resolveLocalImageSourcesForExport(dsl, options);
    let themeStyles = this.buildThemeStyles(options.themePath);
    const webviewCss = readWebviewCssIfPresent(options.extensionPath);
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
