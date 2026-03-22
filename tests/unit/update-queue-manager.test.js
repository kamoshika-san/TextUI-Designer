'use strict';

const assert = require('assert');
const sinon = require('sinon');
const { UpdateQueueManager } = require('../../out/services/webview/update-queue-manager');
const { ConfigManager } = require('../../out/utils/config-manager');

describe('UpdateQueueManager (T-302 latest-wins)', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(ConfigManager, 'getPerformanceSettings').returns({
      minUpdateInterval: 80
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('最小間隔内の非強制更新は破棄せず、遅延後に最新1件だけ実行される', async function () {
    this.timeout(5000);
    const clock = sandbox.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const q = new UpdateQueueManager();
    const calls = [];

    await q.queueUpdate(async () => {
      calls.push('first');
    }, false, 0);
    assert.deepStrictEqual(calls, ['first']);

    // 完了時刻を進め、次の非強制更新が最小間隔スロットル対象になるようにする
    await clock.tickAsync(1);

    void q.queueUpdate(async () => {
      calls.push('second');
    }, false, 0);
    assert.deepStrictEqual(calls, ['first'], '即時には second は走らない');

    void q.queueUpdate(async () => {
      calls.push('third');
    }, false, 0);
    assert.deepStrictEqual(calls, ['first'], 'さらに third に差し替え、まだタイマー待ち');

    await clock.tickAsync(80);
    assert.deepStrictEqual(
      calls,
      ['first', 'third'],
      '遅延後は最後に積んだ third のみ（second は coalesce）'
    );

    q.dispose();
    clock.restore();
  });

  it('強制更新は保留中の遅延 latest を打ち消して直ちにキューへ入る', async function () {
    this.timeout(5000);
    const clock = sandbox.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const q = new UpdateQueueManager();
    const calls = [];

    await q.queueUpdate(async () => {
      calls.push('a');
    }, false, 0);

    void q.queueUpdate(async () => {
      calls.push('pending');
    }, false, 0);

    await q.queueUpdate(async () => {
      calls.push('forced');
    }, true, 10);

    assert.ok(calls.includes('forced'), '強制は直ちに処理される想定');
    await clock.tickAsync(80);
    assert.ok(
      !calls.includes('pending'),
      '遅延予定だった pending は強制によりクリアされる'
    );

    q.dispose();
    clock.restore();
  });
});
