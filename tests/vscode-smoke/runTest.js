const path = require('path');
const { runTests } = require('@vscode/test-electron');
const { isRetryableError } = require('./retryable-error');

const DEFAULT_RETRY_COUNT = 3;
const RETRY_BACKOFF_MS = 5000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function retryReason(error) {
  if (error && typeof error === 'object' && typeof error.code === 'string' && error.code) {
    return error.code;
  }
  if (error instanceof Error && error.message) {
    return error.message.split('\n')[0];
  }
  return String(error).split('\n')[0];
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
        `[vscode-smoke] transient VS Code download error (${retryReason(error)}); retrying (${attempt}/${retryCount}) after ${waitMs}ms`
      );
      await sleep(waitMs);
    }
  }
}

main().catch(error => {
  console.error('Real VS Code smoke failed:', error);
  process.exit(1);
});
