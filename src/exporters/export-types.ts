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
   * - false: fallback path via BaseComponentRenderer string renderers. Used for capture and explicit fallback tests.
   */
  useReactRender?: boolean;
  /** Extension root path used to resolve WebView CSS such as `media/assets/index-*.css`. */
  extensionPath?: string;
}

export interface Exporter {
  export(dsl: TextUIDSL, options: ExportOptions): Promise<string>;
  getFileExtension(): string;
}
