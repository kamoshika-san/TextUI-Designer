/**
 * T-20260320-014 pilot: `ts-node` で `src/*.ts` を直接読み込み、ビルド済み `out/` なしでも
 * 一部ロジックを検証できる経路の実証（本番の多数のテストは引き続き `out/` を契約とする）。
 */
const path = require('path');
const assert = require('assert');

require('ts-node').register({
  transpileOnly: true,
  project: path.join(__dirname, '../../tsconfig.json')
});

const { Logger } = require('../../src/utils/logger');

describe('Logger (ts-node / src pilot)', () => {
  const originalLevel = process.env.TEXTUI_LOG_LEVEL;

  afterEach(() => {
    if (originalLevel === undefined) {
      delete process.env.TEXTUI_LOG_LEVEL;
    } else {
      process.env.TEXTUI_LOG_LEVEL = originalLevel;
    }
  });

  it('TEXTUI_LOG_LEVEL=error のとき debug は抑制される', () => {
    process.env.TEXTUI_LOG_LEVEL = 'error';
    const logger = new Logger('Pilot');
    assert.strictEqual(logger.shouldLog('debug'), false);
    assert.strictEqual(logger.shouldLog('error'), true);
  });
});
