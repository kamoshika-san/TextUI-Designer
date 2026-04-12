/**
 * Review Engine — Decision 型・DecisionStore テスト
 * T-RE1-003 / T-RE1-011
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('review-engine: Decision type and validation', () => {
  let re;

  before(() => {
    re = require('../../out/domain/review-engine');
  });

  // ── requiresRationale ────────────────────────────────────────────────────

  it('requiresRationale returns true for reject and defer', () => {
    assert.strictEqual(re.requiresRationale('reject'), true);
    assert.strictEqual(re.requiresRationale('defer'), true);
  });

  it('requiresRationale returns false for accept and ignore', () => {
    assert.strictEqual(re.requiresRationale('accept'), false);
    assert.strictEqual(re.requiresRationale('ignore'), false);
  });

  // ── validateDecision ─────────────────────────────────────────────────────

  it('validateDecision returns null for valid accept decision', () => {
    const err = re.validateDecision({
      changeId: 'change-0',
      decision: 'accept',
      author: 'alice',
      timestamp: Date.now()
    });
    assert.strictEqual(err, null);
  });

  it('validateDecision returns null for valid reject with rationale', () => {
    const err = re.validateDecision({
      changeId: 'change-1',
      decision: 'reject',
      rationale: 'breaks layout',
      author: 'bob',
      timestamp: Date.now()
    });
    assert.strictEqual(err, null);
  });

  it('validateDecision returns error when reject has no rationale', () => {
    const err = re.validateDecision({
      changeId: 'change-2',
      decision: 'reject',
      author: 'alice',
      timestamp: Date.now()
    });
    assert.ok(err !== null);
    assert.ok(err.includes('rationale'));
  });

  it('validateDecision returns error when defer has empty rationale', () => {
    const err = re.validateDecision({
      changeId: 'change-3',
      decision: 'defer',
      rationale: '   ',
      author: 'alice',
      timestamp: Date.now()
    });
    assert.ok(err !== null);
    assert.ok(err.includes('rationale'));
  });

  it('validateDecision returns error when changeId is missing', () => {
    const err = re.validateDecision({
      decision: 'accept',
      author: 'alice',
      timestamp: Date.now()
    });
    assert.ok(err !== null);
    assert.ok(err.includes('changeId'));
  });

  it('validateDecision returns error when author is missing', () => {
    const err = re.validateDecision({
      changeId: 'change-0',
      decision: 'accept',
      timestamp: Date.now()
    });
    assert.ok(err !== null);
    assert.ok(err.includes('author'));
  });
});

describe('review-engine: InMemoryDecisionStore', () => {
  let re;

  before(() => {
    re = require('../../out/domain/review-engine');
  });

  it('stores and retrieves a decision by changeId', () => {
    const store = new re.InMemoryDecisionStore();
    const decision = {
      changeId: 'change-0',
      decision: 'accept',
      author: 'alice',
      timestamp: 1000
    };
    store.set(decision);
    assert.deepStrictEqual(store.get('change-0'), decision);
  });

  it('returns undefined for unknown changeId', () => {
    const store = new re.InMemoryDecisionStore();
    assert.strictEqual(store.get('nonexistent'), undefined);
  });

  it('overwrites existing decision on set', () => {
    const store = new re.InMemoryDecisionStore();
    store.set({ changeId: 'change-0', decision: 'accept', author: 'alice', timestamp: 1000 });
    store.set({ changeId: 'change-0', decision: 'reject', rationale: 'changed mind', author: 'alice', timestamp: 2000 });
    assert.strictEqual(store.get('change-0').decision, 'reject');
  });

  it('list returns all stored decisions', () => {
    const store = new re.InMemoryDecisionStore();
    store.set({ changeId: 'change-0', decision: 'accept', author: 'alice', timestamp: 1000 });
    store.set({ changeId: 'change-1', decision: 'ignore', author: 'bob', timestamp: 2000 });
    assert.strictEqual(store.list().length, 2);
  });

  it('persist and load are no-ops (resolve without error)', async () => {
    const store = new re.InMemoryDecisionStore();
    await store.persist();
    await store.load();
    assert.strictEqual(store.list().length, 0);
  });
});

describe('review-engine: DecisionJsonStore', () => {
  let re;
  let tmpDir;

  before(() => {
    re = require('../../out/domain/review-engine');
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'decision-store-test-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('persists decisions to .textui/decisions/<key>.json', async () => {
    const store = new re.DecisionJsonStore(tmpDir, 'screens/home.tui.yml');
    store.set({ changeId: 'change-0', decision: 'accept', author: 'alice', timestamp: 1000 });
    await store.persist();

    const filePath = store.getFilePath();
    assert.ok(fs.existsSync(filePath), `file should exist: ${filePath}`);

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.strictEqual(raw.schemaVersion, 'decision-store/v1');
    assert.strictEqual(raw.decisions.length, 1);
    assert.strictEqual(raw.decisions[0].changeId, 'change-0');
  });

  it('loads persisted decisions after restart', async () => {
    const store1 = new re.DecisionJsonStore(tmpDir, 'screens/login.tui.yml');
    store1.set({ changeId: 'change-1', decision: 'defer', rationale: 'needs design review', author: 'bob', timestamp: 2000 });
    await store1.persist();

    const store2 = new re.DecisionJsonStore(tmpDir, 'screens/login.tui.yml');
    await store2.load();

    const loaded = store2.get('change-1');
    assert.ok(loaded, 'decision should be loaded');
    assert.strictEqual(loaded.decision, 'defer');
    assert.strictEqual(loaded.rationale, 'needs design review');
  });

  it('returns empty list when file does not exist', async () => {
    const store = new re.DecisionJsonStore(tmpDir, 'screens/nonexistent.tui.yml');
    await store.load();
    assert.deepStrictEqual(store.list(), []);
  });

  it('file path is under .textui/decisions/', () => {
    const store = new re.DecisionJsonStore(tmpDir, 'screens/home.tui.yml');
    const filePath = store.getFilePath();
    assert.ok(filePath.includes('.textui'), `path should include .textui: ${filePath}`);
    assert.ok(filePath.includes('decisions'), `path should include decisions: ${filePath}`);
    assert.ok(filePath.endsWith('.json'), `path should end with .json: ${filePath}`);
  });

  it('handles corrupted JSON file gracefully', async () => {
    const store = new re.DecisionJsonStore(tmpDir, 'screens/corrupt.tui.yml');
    const filePath = store.getFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }
    fs.writeFileSync(filePath, 'not valid json', 'utf8');

    await store.load(); // should not throw
    assert.deepStrictEqual(store.list(), []);
  });
});
