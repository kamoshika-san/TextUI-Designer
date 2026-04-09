import type { NavigationFlowDSL, TextUIDSL } from '../domain/dsl-types';
import type { DiffRenderTarget } from '../core/textui-core-diff';

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
  /** Whether to include descriptive comments in the generated output. */
  includeComments?: boolean;
  /** Explicit OFF-by-default route gate for the incremental diff export path. */
  enableIncrementalDiffRoute?: boolean;
  /** Stable exporter-facing render targets derived from diff output. */
  incrementalRenderTargets?: DiffRenderTarget[];
}

export interface Exporter {
  export(dsl: TextUIDSL | NavigationFlowDSL, options: ExportOptions): Promise<string>;
  getFileExtension(): string;
}
