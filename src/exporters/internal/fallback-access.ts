import {
  EXPLICIT_FALLBACK_HTML_EXPORT_OPTIONS,
  withExplicitFallbackHtmlExport
} from './fallback-lane-options';

/**
 * Single entry for exporter code that must build explicit fallback export options.
 * @internal Not a supported public API — unit tests must use `tests/helpers/fallback-helper.js` (T-020).
 */
// Underscore prefix signals "do not touch from product code"; eslint naming otherwise trims `__`.
/* eslint-disable @typescript-eslint/naming-convention -- T-020 intentional internal export surface */
export const __fallbackAccess = {
  createOptions: withExplicitFallbackHtmlExport,
  explicitFallbackOptions: EXPLICIT_FALLBACK_HTML_EXPORT_OPTIONS
} as const;
/* eslint-enable @typescript-eslint/naming-convention */
