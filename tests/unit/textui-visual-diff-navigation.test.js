'use strict';

const assert = require('assert');

describe('textui visual diff navigation (P1-T3)', () => {
  let navigation;

  before(() => {
    navigation = require('../../out/core/textui-visual-diff-navigation');
  });

  function makeNode(overrides = {}) {
    return {
      nodeId: overrides.nodeId || 'node-1',
      changeKind: overrides.changeKind || 'update',
      entityKind: overrides.entityKind || 'component',
      severity: overrides.severity || 's1-notice',
      isHeuristic: overrides.isHeuristic || false,
      isAmbiguous: overrides.isAmbiguous || false,
      beforePath: overrides.beforePath,
      afterPath: overrides.afterPath,
      label: overrides.label || 'Example label',
      evidenceRefs: overrides.evidenceRefs || {
        eventId: overrides.nodeId || 'node-1',
        previousSourcePath: overrides.previousSourcePath,
        nextSourcePath: overrides.nextSourcePath,
      },
    };
  }

  it('keeps add navigation one-sided and hides the missing before jump in compact mode', () => {
    const result = navigation.mapVisualDiffNavigation(
      makeNode({
        changeKind: 'add',
        afterPath: '/page/components/0',
        nextSourcePath: 'next.tui.yml',
      })
    );

    assert.strictEqual(result.primarySide, 'after');
    assert.strictEqual(result.before.availability, 'unavailable');
    assert.strictEqual(result.before.missingReason, 'not-applicable');
    assert.strictEqual(result.before.visibility.compact, 'hidden');
    assert.strictEqual(result.after.availability, 'available');
    assert.strictEqual(result.after.visibility.compact, 'primary');
  });

  it('keeps remove navigation one-sided and preserves the before jump target', () => {
    const result = navigation.mapVisualDiffNavigation(
      makeNode({
        changeKind: 'remove',
        beforePath: '/page/components/1',
        previousSourcePath: 'prev.tui.yml',
      })
    );

    assert.strictEqual(result.primarySide, 'before');
    assert.strictEqual(result.before.availability, 'available');
    assert.strictEqual(result.before.path, '/page/components/1');
    assert.strictEqual(result.after.missingReason, 'not-applicable');
    assert.strictEqual(result.after.visibility.compact, 'hidden');
  });

  it('keeps both sides visible for update navigation and downgrades after to secondary in compact mode', () => {
    const result = navigation.mapVisualDiffNavigation(
      makeNode({
        changeKind: 'update',
        beforePath: '/page/components/0',
        afterPath: '/page/components/0',
        previousSourcePath: 'prev.tui.yml',
        nextSourcePath: 'next.tui.yml',
      })
    );

    assert.strictEqual(result.primarySide, 'both');
    assert.strictEqual(result.before.availability, 'available');
    assert.strictEqual(result.after.availability, 'available');
    assert.strictEqual(result.before.visibility.compact, 'primary');
    assert.strictEqual(result.after.visibility.compact, 'secondary');
  });

  it('returns deterministic fallback copy when path and source refs are missing', () => {
    const result = navigation.mapVisualDiffNavigation(
      makeNode({
        changeKind: 'update',
      })
    );

    assert.strictEqual(result.primarySide, 'none');
    assert.strictEqual(result.before.missingReason, 'missing-path-and-source-ref');
    assert.strictEqual(result.after.missingReason, 'missing-path-and-source-ref');
    assert.strictEqual(result.before.fallbackText, 'before source link is unavailable.');
    assert.strictEqual(result.after.fallbackText, 'after source link is unavailable.');
    assert.strictEqual(result.before.visibility.full, 'muted');
    assert.strictEqual(result.after.visibility.full, 'muted');
  });

  it('builds a navigation model with compact/full support metadata', () => {
    const viewModel = {
      kind: 'visual-diff-view-model/v0',
      items: [
        makeNode({
          nodeId: 'a',
          changeKind: 'add',
          afterPath: '/page/components/0',
          nextSourcePath: 'next.tui.yml',
        }),
        makeNode({
          nodeId: 'b',
          changeKind: 'remove',
          beforePath: '/page/components/1',
          previousSourcePath: 'prev.tui.yml',
        }),
      ],
      groups: [],
      metadata: {
        totalItems: 2,
        highestSeverity: 's1-notice',
        containsHeuristic: false,
        containsAmbiguity: false,
        sourceMapping: {
          external: 'DiffResultExternal.events[]',
          reviewImpact: 'DiffReviewImpactResult.impacts[]',
          narrative: 'DiffNarrativeResult.groups[].items[]',
        },
      },
    };

    const result = navigation.buildVisualDiffNavigationModel(viewModel);

    assert.strictEqual(result.kind, 'visual-diff-navigation/v0');
    assert.strictEqual(result.metadata.totalItems, 2);
    assert.strictEqual(result.metadata.supportsCompactMode, true);
    assert.strictEqual(result.metadata.supportsFullMode, true);
  });
});
