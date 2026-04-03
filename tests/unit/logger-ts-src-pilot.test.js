/**
 * T-20260320-014 pilot: keep one small test path that executes src/*.ts through ts-node
 * so logger changes can be checked before compile when needed.
 */
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');

require('ts-node').register({
  transpileOnly: true,
  project: path.join(__dirname, '../../tsconfig.json')
});

const { Logger } = require('../../src/utils/logger');

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

describe('Logger (ts-node / src pilot)', () => {
  const originalLevel = process.env.TEXTUI_LOG_LEVEL;

  before(function() {
    this.timeout(10000);
  });

  afterEach(() => {
    if (originalLevel === undefined) {
      delete process.env.TEXTUI_LOG_LEVEL;
    } else {
      process.env.TEXTUI_LOG_LEVEL = originalLevel;
    }
  });

  it('suppresses debug when TEXTUI_LOG_LEVEL=error', () => {
    process.env.TEXTUI_LOG_LEVEL = 'error';
    const logger = new Logger('Pilot');
    assert.strictEqual(logger.shouldLog('debug'), false);
    assert.strictEqual(logger.shouldLog('error'), true);
  });

  it('formats severity labels in src logger output', () => {
    const result = runNode(
      `
        require('ts-node').register({ transpileOnly: true, project: './tsconfig.json' });
        const { Logger } = require('./src/utils/logger');
        const logger = new Logger('Pilot');
        logger.info('from src');
      `,
      {
        TEXTUI_LOG_LEVEL: 'debug',
        NODE_ENV: 'test'
      }
    );

    assert.match(result.stdout, /\[TextUI\]\[INFO\]\[Pilot\] from src/);
  });
});
