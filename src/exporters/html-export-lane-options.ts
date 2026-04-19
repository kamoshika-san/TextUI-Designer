/**
 * Explicit fallback lane for HtmlExporter.
 *
 * @internal **Do not import from CLI, MCP, services, or other non-exporter app code.**
 * Allowed call sites: `src/exporters/**` implementation and **unit tests** that intentionally
 * exercise the compatibility lane. Policy: `docs/current/theme-export-rendering/t017-html-export-lane-options-internal-api.md`.
 */
export const EXPLICIT_FALLBACK_HTML_EXPORT_OPTIONS = Object.freeze({
  useReactRender: false as const,
  __internalLegacyFallback: true as const
});

/**
 * Merges export options with {@link EXPLICIT_FALLBACK_HTML_EXPORT_OPTIONS}.
 *
 * @internal Same import restrictions as {@link EXPLICIT_FALLBACK_HTML_EXPORT_OPTIONS}.
 */
export function withExplicitFallbackHtmlExport<T extends object>(
  options: T
): T & typeof EXPLICIT_FALLBACK_HTML_EXPORT_OPTIONS {
  return {
    ...options,
    ...EXPLICIT_FALLBACK_HTML_EXPORT_OPTIONS
  };
}
