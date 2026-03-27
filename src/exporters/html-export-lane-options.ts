/**
 * Explicit fallback lane for HtmlExporter.
 * Keep fallback selection behind a named helper so new call sites stay reviewable.
 */
export const EXPLICIT_FALLBACK_HTML_EXPORT_OPTIONS = Object.freeze({
  useReactRender: false as const,
  __internalLegacyFallback: true as const
});

export function withExplicitFallbackHtmlExport<T extends object>(
  options: T
): T & typeof EXPLICIT_FALLBACK_HTML_EXPORT_OPTIONS {
  return {
    ...options,
    ...EXPLICIT_FALLBACK_HTML_EXPORT_OPTIONS
  };
}
