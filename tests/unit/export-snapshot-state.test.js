const assert = require('assert');

const { ExportSnapshotState } = require('../../out/exporters/export-snapshot-state');

describe('ExportSnapshotState', () => {
  function createDsl(title) {
    return {
      page: {
        id: 'page-1',
        title,
        layout: 'vertical',
        components: []
      }
    };
  }

  it('stores and retrieves snapshot by sourcePath', () => {
    const state = new ExportSnapshotState();
    const sourcePath = '/tmp/sample.tui.yml';
    const dsl = createDsl('stored');

    state.rememberSnapshot(sourcePath, dsl);

    assert.strictEqual(state.hasSnapshot(sourcePath), true);
    assert.deepStrictEqual(state.getSnapshot(sourcePath), dsl);
  });

  it('ignores empty sourcePath and resets snapshots on clear', () => {
    const state = new ExportSnapshotState();
    state.rememberSnapshot('', createDsl('ignored'));
    assert.strictEqual(state.hasSnapshot(''), false);

    const sourcePath = '/tmp/sample.tui.yml';
    state.rememberSnapshot(sourcePath, createDsl('stored'));
    assert.strictEqual(state.hasSnapshot(sourcePath), true);

    state.clear();
    assert.strictEqual(state.hasSnapshot(sourcePath), false);
    assert.strictEqual(state.getSnapshot(sourcePath), undefined);
  });
});
