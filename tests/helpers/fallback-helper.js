'use strict';

/**
 * T-020: Only supported test entrypoint for explicit HtmlExporter fallback lane options.
 * Do not require `out/exporters/internal/*` directly from unit tests — ESLint enforces this.
 */
const { __fallbackAccess } = require('../../out/exporters/internal/fallback-access');

/** @param {object} options */
function createFallbackOptions(options) {
  return __fallbackAccess.createOptions(options);
}

module.exports = { createFallbackOptions };
