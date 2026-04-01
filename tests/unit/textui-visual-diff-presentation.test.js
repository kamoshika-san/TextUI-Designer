'use strict';

const assert = require('assert');

describe('textui visual diff presentation (P1-T2)', () => {
  let presentation;

  before(() => {
    presentation = require('../../out/core/textui-visual-diff-presentation');
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
      evidenceRefs: overrides.evidenceRefs || { eventId: overrides.nodeId || 'node-1' },
    };
  }

  it('maps severity one-to-one to critical/warn/notice/minor labels', () => {
    assert.strictEqual(
      presentation.mapVisualDiffPresentation(makeNode({ severity: 's3-critical' })).severityLabel,
      'critical'
    );
    assert.strictEqual(
      presentation.mapVisualDiffPresentation(makeNode({ severity: 's2-review' })).severityLabel,
      'warn'
    );
    assert.strictEqual(
      presentation.mapVisualDiffPresentation(makeNode({ severity: 's1-notice' })).severityLabel,
      'notice'
    );
    assert.strictEqual(
      presentation.mapVisualDiffPresentation(makeNode({ severity: 's0-minor' })).severityLabel,
      'minor'
    );
  });

  it('treats remove+add as replace-split with fallback and replace badges', () => {
    const result = presentation.mapVisualDiffPresentation(
      makeNode({
        changeKind: 'remove+add',
        severity: 's3-critical',
        isAmbiguous: true,
      })
    );

    assert.strictEqual(result.renderStyle, 'replace-split');
    assert.ok(result.badges.includes('replace'));
    assert.ok(result.badges.includes('fallback'));
    assert.ok(result.badges.includes('ambiguous'));
    assert.strictEqual(result.reviewPriority, 'high');
  });

  it('marks heuristic review cases with heuristic and review-required badges', () => {
    const result = presentation.mapVisualDiffPresentation(
      makeNode({
        changeKind: 'update',
        severity: 's2-review',
        isHeuristic: true,
      })
    );

    assert.ok(result.badges.includes('heuristic'));
    assert.ok(result.badges.includes('review-required'));
    assert.strictEqual(result.reviewPriority, 'medium');
  });

  it('defines add/remove path requirements without breaking one-sided navigation', () => {
    const addResult = presentation.mapVisualDiffPresentation(
      makeNode({ changeKind: 'add', afterPath: '/page/components/0' })
    );
    const removeResult = presentation.mapVisualDiffPresentation(
      makeNode({ changeKind: 'remove', beforePath: '/page/components/0' })
    );

    assert.deepStrictEqual(addResult.pathPresentation, {
      beforePathRequired: false,
      afterPathRequired: true,
    });
    assert.deepStrictEqual(removeResult.pathPresentation, {
      beforePathRequired: true,
      afterPathRequired: false,
    });
  });

  it('builds a presentation model with stable severity legend metadata', () => {
    const viewModel = {
      kind: 'visual-diff-view-model/v0',
      items: [
        makeNode({ nodeId: 'a', changeKind: 'add', severity: 's1-notice' }),
        makeNode({ nodeId: 'b', changeKind: 'move', severity: 's2-review', isHeuristic: true }),
      ],
      groups: [],
      metadata: {
        totalItems: 2,
        highestSeverity: 's2-review',
        containsHeuristic: true,
        containsAmbiguity: false,
        sourceMapping: {
          external: 'DiffResultExternal.events[]',
          reviewImpact: 'DiffReviewImpactResult.impacts[]',
          narrative: 'DiffNarrativeResult.groups[].items[]',
        },
      },
    };

    const result = presentation.buildVisualDiffPresentationModel(viewModel);

    assert.strictEqual(result.kind, 'visual-diff-presentation/v0');
    assert.strictEqual(result.metadata.totalItems, 2);
    assert.strictEqual(result.metadata.containsHeuristic, true);
    assert.deepStrictEqual(result.metadata.severityLegend, {
      critical: 's3-critical',
      warn: 's2-review',
      notice: 's1-notice',
      minor: 's0-minor',
    });
  });
});
