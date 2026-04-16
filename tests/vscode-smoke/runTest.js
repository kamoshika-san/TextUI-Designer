const path = require('path');
const { runTests } = require('@vscode/test-electron');

const DEFAULT_RETRY_COUNT = 3;
const RETRY_BACKOFF_MS = 5000;
const RETRYABLE_PATTERNS = [
  /Failed to get JSON/i,
  /Failed to parse response from https:\/\/update\.code\.visualstudio\.com\/api\/releases\/stable/i,
  /request timeout/i
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(error) {
  const message = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
  return RETRYABLE_PATTERNS.some(pattern => pattern.test(message));
}

async function main() {
  const extensionDevelopmentPath = path.resolve(__dirname, '..', '..');
  const extensionTestsPath = path.resolve(__dirname, 'suite', 'index.js');
  const retryCountRaw = Number(process.env.VSCODE_SMOKE_RETRIES ?? DEFAULT_RETRY_COUNT);
  const retryCount = Number.isFinite(retryCountRaw) && retryCountRaw > 0
    ? Math.floor(retryCountRaw)
    : DEFAULT_RETRY_COUNT;

  for (let attempt = 1; attempt <= retryCount; attempt += 1) {
    try {
      await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs: ['--disable-extensions']
      });
      return;
    } catch (error) {
      if (attempt >= retryCount || !isRetryableError(error)) {
        throw error;
      }

      const waitMs = RETRY_BACKOFF_MS * attempt;
      console.warn(
        `[vscode-smoke] transient VS Code update service error detected; retrying (${attempt}/${retryCount}) after ${waitMs}ms`
      );
      await sleep(waitMs);
    }
  }
}

main().catch(error => {
  console.error('Real VS Code smoke failed:', error);
  process.exit(1);
});
