/**
 * Compiled logger tests that exercise the emitted runtime shape from out/utils/logger.
 * Source-level coverage lives in logger-ts-src-pilot.test.js.
 */
const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');
const { Logger } = require('../../out/utils/logger');

const repoRoot = path.resolve(__dirname, '../..');

function runNode(script, env = {}) {
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...env
    },
    encoding: 'utf8'
  });

  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  return result;
}

describe('Logger', () => {
  const originalLevel = process.env.TEXTUI_LOG_LEVEL;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalLevel === undefined) {
      delete process.env.TEXTUI_LOG_LEVEL;
    } else {
      process.env.TEXTUI_LOG_LEVEL = originalLevel;
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('suppresses debug and info when TEXTUI_LOG_LEVEL=error', () => {
    process.env.TEXTUI_LOG_LEVEL = 'error';

    const logger = new Logger('Test');

    assert.strictEqual(logger.shouldLog('debug'), false);
    assert.strictEqual(logger.shouldLog('info'), false);
    assert.strictEqual(logger.shouldLog('error'), true);
  });

  it('defaults to debug logging in development mode', () => {
    delete process.env.TEXTUI_LOG_LEVEL;
    process.env.NODE_ENV = 'development';

    const logger = new Logger('Test');

    assert.strictEqual(logger.shouldLog('debug'), true);
    assert.strictEqual(logger.shouldLog('info'), true);
  });

  it('emits explicit INFO and WARN labels in runtime output', () => {
    const result = runNode(
      `
        const { Logger } = require('./out/utils/logger');
        const logger = new Logger('Test');
        logger.info('hello info');
        logger.warn('hello warn');
      `,
      {
        TEXTUI_LOG_LEVEL: 'debug',
        NODE_ENV: 'test'
      }
    );

    assert.match(result.stdout, /\[TextUI\]\[INFO\]\[Test\] hello info/);
    assert.match(result.stderr, /\[TextUI\]\[WARN\]\[Test\] hello warn/);
  });

  it('emits explicit ERROR labels and keeps extra args', () => {
    const result = runNode(
      `
        const { Logger } = require('./out/utils/logger');
        const logger = new Logger('Test');
        logger.error('hello error', new Error('boom'));
      `,
      {
        TEXTUI_LOG_LEVEL: 'debug',
        NODE_ENV: 'test'
      }
    );

    assert.match(result.stderr, /\[TextUI\]\[ERROR\]\[Test\] hello error/);
    assert.match(result.stderr, /Error: boom/);
  });
});
