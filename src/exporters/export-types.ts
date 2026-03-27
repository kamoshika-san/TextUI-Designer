import type { TextUIDSL } from '../domain/dsl-types';

export interface ExportOptions {
  format: string;
  outputPath?: string;
  fileName?: string;
  themePath?: string;
  sourcePath?: string;
  /**
   * Selects the HtmlExporter path.
   * - omitted / true: primary path via react-static-export. This is the default source-of-truth path.
   * - false: deprecated public fallback request. Internal compatibility callers must pair it with
   *   `withExplicitFallbackHtmlExport(...)` from `html-export-lane-options`.
   */
  useReactRender?: boolean;
  /** @internal Temporary compatibility marker for the explicit fallback helper only. */
  __internalLegacyFallback?: boolean;
  /** Extension root path used to resolve WebView CSS such as `media/assets/index-*.css`. */
  extensionPath?: string;
}

export interface Exporter {
  export(dsl: TextUIDSL, options: ExportOptions): Promise<string>;
  getFileExtension(): string;
}
