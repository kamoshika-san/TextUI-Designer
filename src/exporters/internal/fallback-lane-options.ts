/**
 * Explicit fallback lane for HtmlExporter (module-local implementation).
 *
 * @internal Do not import this file from outside `src/exporters/internal/**` except the
 * compatibility facade (`fallback-access.ts`). Policy:
 * `docs/current/theme-export-rendering/t017-html-export-lane-options-internal-api.md`.
 */
export const EXPLICIT_FALLBACK_HTML_EXPORT_OPTIONS = Object.freeze({
  useReactRender: false as const,
  __internalLegacyFallback: true as const
});

/**
 * Merges export options with {@link EXPLICIT_FALLBACK_HTML_EXPORT_OPTIONS}.
 * Not a public export — use {@link __fallbackAccess} from `fallback-access.ts` inside exporters,
 * or `createFallbackOptions` from `tests/helpers/fallback-helper.js` in unit tests (T-020).
 */
export function withExplicitFallbackHtmlExport<T extends object>(
  options: T
): T & typeof EXPLICIT_FALLBACK_HTML_EXPORT_OPTIONS {
  return {
    ...options,
    ...EXPLICIT_FALLBACK_HTML_EXPORT_OPTIONS
  };
}
