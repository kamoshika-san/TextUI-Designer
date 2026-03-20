/**
 * 既定は `out/utils/logger`（tsc 成果物）を読む。ビルド成果物契約に合わせ、CI との差分を最小化する。
 * `src` 直読みの実証は `logger-ts-src-pilot.test.js`（`T-20260320-014`）を参照。
 */
const assert = require('assert');
const { Logger } = require('../../out/utils/logger');

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

  it('TEXTUI_LOG_LEVEL=error のとき debug/info は抑制される', () => {
    process.env.TEXTUI_LOG_LEVEL = 'error';

    const logger = new Logger('Test');

    assert.strictEqual(logger.shouldLog('debug'), false);
    assert.strictEqual(logger.shouldLog('info'), false);
    assert.strictEqual(logger.shouldLog('error'), true);
  });

  it('NODE_ENV=development かつ未設定時は debug が有効になる', () => {
    delete process.env.TEXTUI_LOG_LEVEL;
    process.env.NODE_ENV = 'development';

    const logger = new Logger('Test');

    assert.strictEqual(logger.shouldLog('debug'), true);
    assert.strictEqual(logger.shouldLog('info'), true);
  });
});
