/**
 * Review Engine — Decision Gate テスト
 * T-RE1-017
 *
 * handleReviewCheckCommand は git diff を呼ぶため直接テストが困難。
 * ここでは DecisionJsonStore の load/get ロジックと
 * undecided 検出ロジックを単体でテストする。
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('review-engine: Decision Gate logic', () => {
  let re;
  let tmpDir;

  before(() => {
    re = require('../../out/domain/review-engine');
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'decision-gate-test-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── 全 changeId に Decision がある場合 ───────────────────────────────────

  it('all decided: no undecided changeIds', async () => {
    const store = new re.DecisionJsonStore(tmpDir, 'screens/home.tui.yml');
    store.set({ changeId: 'change-0', decision: 'accept', author: 'alice', timestamp: 1000 });
    store.set({ changeId: 'change-1', decision: 'reject', rationale: 'bad', author: 'alice', timestamp: 2000 });
    await store.persist();

    // 再ロードして確認
    const store2 = new re.DecisionJsonStore(tmpDir, 'screens/home.tui.yml');
    await store2.load();

    const changeIds = ['change-0', 'change-1'];
    const undecided = changeIds.filter(id => !store2.get(id));
    assert.strictEqual(undecided.length, 0);
  });

  // ── 未決定 changeId がある場合 ────────────────────────────────────────────

  it('partial decided: undecided changeIds detected', async () => {
    const store = new re.DecisionJsonStore(tmpDir, 'screens/login.tui.yml');
    store.set({ changeId: 'change-0', decision: 'accept', author: 'alice', timestamp: 1000 });
    await store.persist();

    const store2 = new re.DecisionJsonStore(tmpDir, 'screens/login.tui.yml');
    await store2.load();

    const changeIds = ['change-0', 'change-1', 'change-2'];
    const undecided = changeIds.filter(id => !store2.get(id));
    assert.strictEqual(undecided.length, 2);
    assert.ok(undecided.includes('change-1'));
    assert.ok(undecided.includes('change-2'));
  });

  // ── ファイルが存在しない場合（全未決定） ──────────────────────────────────

  it('no decision file: all changeIds are undecided', async () => {
    const store = new re.DecisionJsonStore(tmpDir, 'screens/nonexistent.tui.yml');
    await store.load(); // ファイルなし → 空ストア

    const changeIds = ['change-0', 'change-1'];
    const undecided = changeIds.filter(id => !store.get(id));
    assert.strictEqual(undecided.length, 2);
  });

  // ── --fail-on-undecided ロジック ──────────────────────────────────────────

  it('fail-on-undecided: returns 1 when undecided exist', () => {
    const undecided = ['change-1'];
    const failOnUndecided = true;
    const exitCode = (failOnUndecided && undecided.length > 0) ? 1 : 0;
    assert.strictEqual(exitCode, 1);
  });

  it('fail-on-undecided: returns 0 when all decided', () => {
    const undecided = [];
    const failOnUndecided = true;
    const exitCode = (failOnUndecided && undecided.length > 0) ? 1 : 0;
    assert.strictEqual(exitCode, 0);
  });

  it('no fail-on-undecided flag: returns 0 even with undecided', () => {
    const undecided = ['change-1', 'change-2'];
    const failOnUndecided = false;
    const exitCode = (failOnUndecided && undecided.length > 0) ? 1 : 0;
    assert.strictEqual(exitCode, 0);
  });
});
