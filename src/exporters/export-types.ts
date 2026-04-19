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
   * - false: deprecated public fallback request. **Only exporter-internal compatibility code** may set
   *   this together with `__internalLegacyFallback`; do not wire new CLI/MCP/service call sites to
   *   `withExplicitFallbackHtmlExport` (see `docs/current/theme-export-rendering/t017-html-export-lane-options-internal-api.md`).
   */
  useReactRender?: boolean;
  /**
   * @internal Temporary compatibility marker for the explicit fallback helper only.
   * When `useReactRender === false`, **HtmlExporter** also requires **`TEXTUI_ENABLE_FALLBACK=1`**
   * at runtime (set in `tests/setup.js` for unit tests; never in production paths).
   */
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
