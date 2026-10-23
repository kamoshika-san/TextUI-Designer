'use strict';

const RETRYABLE_PATTERNS = [
  /Failed to get JSON/i,
  /Failed to parse response from https:\/\/update\.code\.visualstudio\.com\/api\/releases\/stable/i,
  /request timeout/i,
  /ETIMEDOUT/i,
  /ENETUNREACH/i,
  /ECONNRESET/i,
  /ECONNREFUSED/i,
  /EAI_AGAIN/i,
  /EHOSTUNREACH/i,
  /socket hang up/i,
  /Expected TextUI preview command to create a webview tab/i
];

function collectErrorText(error, seen) {
  if (error == null || (typeof error === 'object' && seen.has(error))) {
    return '';
  }
  if (typeof error !== 'object') {
    return String(error);
  }

  seen.add(error);
  const parts = [];
  if (typeof error.code === 'string') {
    parts.push(error.code);
  }
  if (typeof error.message === 'string') {
    parts.push(error.message);
  }
  if (typeof error.stack === 'string') {
    parts.push(error.stack);
  }
  if (Array.isArray(error.errors)) {
    for (const nested of error.errors) {
      parts.push(collectErrorText(nested, seen));
    }
  }
  if (error.cause) {
    parts.push(collectErrorText(error.cause, seen));
  }
  return parts.join('\n');
}

function isRetryableError(error) {
  const text = collectErrorText(error, new Set());
  return RETRYABLE_PATTERNS.some(pattern => pattern.test(text));
}

module.exports = {
  isRetryableError
};
