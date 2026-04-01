const assert = require('assert');

describe('buildThreeWayDiffResult', () => {
  let diff;
  let threeWay;

  function makeDocument(dsl, side, sourcePath) {
    return diff.createNormalizedDiffDocument(dsl, { side, sourcePath });
  }

  before(() => {
    diff = require('../../out/core/textui-core-diff');
    threeWay = require('../../out/core/three-way/build-three-way-diff');
  });

  it('preserves leftDiff and rightDiff while publishing three-way metadata', () => {
    const base = makeDocument({
      page: {
        id: 'base-page',
        title: 'Base',
        layout: 'vertical',
        components: [{ Text: { value: 'Base', variant: 'p' } }],
      },
    }, 'previous', 'base.tui.yml');
    const left = makeDocument({
      page: {
        id: 'left-page',
        title: 'Left',
        layout: 'vertical',
        components: [{ Text: { value: 'Left', variant: 'p' } }],
      },
    }, 'next', 'left.tui.yml');
    const right = makeDocument({
      page: {
        id: 'right-page',
        title: 'Right',
        layout: 'vertical',
        components: [{ Text: { value: 'Right', variant: 'p' } }],
      },
    }, 'next', 'right.tui.yml');

    const result = threeWay.buildThreeWayDiffResult({ base, left, right });

    assert.strictEqual(result.kind, 'textui-three-way-diff-result');
    assert.strictEqual(result.metadata.schemaVersion, 'three-way-diff/v0');
    assert.strictEqual(result.input.base, base);
    assert.strictEqual(result.input.left, left);
    assert.strictEqual(result.input.right, right);
    assert.strictEqual(result.leftDiff.kind, 'textui-diff-result');
    assert.strictEqual(result.rightDiff.kind, 'textui-diff-result');
    assert.strictEqual(result.leftDiff.input.previous.metadata.sourcePath, 'base.tui.yml');
    assert.strictEqual(result.leftDiff.input.next.metadata.sourcePath, 'left.tui.yml');
    assert.strictEqual(result.rightDiff.input.next.metadata.sourcePath, 'right.tui.yml');
    assert.ok(result.leftDiff.events.length > 0);
    assert.ok(result.rightDiff.events.length > 0);
  });

  it('creates classified conflict payloads for overlapping entity keys', () => {
    const base = makeDocument({
      page: {
        id: 'base-page',
        title: 'Shared',
        layout: 'vertical',
        components: [{ Text: { value: 'Base body', variant: 'p' } }],
      },
    }, 'previous');
    const left = makeDocument({
      page: {
        id: 'left-page',
        title: 'Left title',
        layout: 'vertical',
        components: [{ Text: { value: 'Left body', variant: 'p' } }],
      },
    }, 'previous');
    const right = makeDocument({
      page: {
        id: 'right-page',
        title: 'Right title',
        layout: 'vertical',
        components: [{ Text: { value: 'Right body', variant: 'p' } }],
      },
    }, 'previous');

    const result = threeWay.buildThreeWayDiffResult({ base, left, right });
    const pageTitleConflict = result.conflicts.find(conflict => conflict.entityKey === 'property:/page/props/title');

    assert.ok(pageTitleConflict);
    assert.strictEqual(pageTitleConflict.type, 'same-property-different-value');
    assert.strictEqual(pageTitleConflict.severity, 's1-notice');
    assert.strictEqual(pageTitleConflict.resolutionHint, 'auto-merge-safe');
    assert.strictEqual(pageTitleConflict.status, 'candidate');
    assert.strictEqual(pageTitleConflict.matchingBasis, 'entity-key-and-trace');
    assert.ok(pageTitleConflict.leftEventIds.length >= 1);
    assert.ok(pageTitleConflict.rightEventIds.length >= 1);
    assert.strictEqual(pageTitleConflict.evidence.left.pairingReason, 'deterministic-structural-path');
    assert.strictEqual(pageTitleConflict.evidence.right.fallbackMarker, 'none');
    assert.ok(pageTitleConflict.evidence.base);
    assert.strictEqual(result.metadata.conflictCount, result.conflicts.length);
  });

  it('retags documents internally so callers do not need special three-way sides', () => {
    const base = makeDocument({
      page: {
        id: 'base-page',
        title: 'Base',
        layout: 'vertical',
        components: [],
      },
    }, 'next');
    const left = makeDocument({
      page: {
        id: 'left-page',
        title: 'Left',
        layout: 'vertical',
        components: [],
      },
    }, 'previous');
    const right = makeDocument({
      page: {
        id: 'right-page',
        title: 'Right',
        layout: 'vertical',
        components: [],
      },
    }, 'previous');

    const result = threeWay.buildThreeWayDiffResult({ base, left, right });

    assert.strictEqual(result.leftDiff.input.previous.side, 'previous');
    assert.strictEqual(result.leftDiff.input.next.side, 'next');
    assert.strictEqual(result.rightDiff.input.previous.side, 'previous');
    assert.strictEqual(result.rightDiff.input.next.side, 'next');
  });
});
