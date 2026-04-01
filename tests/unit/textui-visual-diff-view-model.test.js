'use strict';

const assert = require('assert');

describe('textui visual diff view model (P1-T1)', () => {
  let visualDiff;

  before(() => {
    visualDiff = require('../../out/core/textui-visual-diff-view-model');
  });

  function makeExternal(events) {
    return {
      kind: 'textui-diff-result-external',
      schemaVersion: 'diff-result-external/v0',
      producer: {
        engine: 'textui-diff-core',
        engineVersion: '0.7.3',
        compareStage: 'c1-skeleton',
      },
      events,
      metadata: {
        eventCount: events.length,
        previousSource: { pageId: 'page-prev', sourcePath: 'prev.tui.yml' },
        nextSource: { pageId: 'page-next', sourcePath: 'next.tui.yml' },
      },
    };
  }

  function makeEvent(eventId, kind, overrides = {}) {
    return {
      eventId,
      kind,
      entityKind: overrides.entityKind || 'component',
      pairingReason: overrides.pairingReason || 'deterministic-structural-path',
      fallbackMarker: overrides.fallbackMarker || 'none',
      previousPath: overrides.previousPath,
      nextPath: overrides.nextPath,
    };
  }

  function makeImpact(eventId, kind, overrides = {}) {
    return {
      eventId,
      sourceEventKind: kind,
      sourceEntityKind: overrides.sourceEntityKind || 'component',
      category: overrides.category || 'behavior-update',
      severity: overrides.severity || 's1-notice',
      impactAxis: overrides.impactAxis || 'behavior',
      summaryKey: overrides.summaryKey || 'behavior.update.component',
      groupHint: overrides.groupHint || overrides.impactAxis || 'behavior',
      heuristicDerived: overrides.heuristicDerived || false,
      ambiguityMarker: overrides.ambiguityMarker || false,
      ruleTrace: overrides.ruleTrace || `trace:${eventId}`,
    };
  }

  function makeNarrativeGroup(axis, items, narrative = `${axis} narrative`) {
    return {
      axis,
      highestSeverity: items[0] ? items[0].severity : 's0-minor',
      narrative,
      items,
    };
  }

  function makeNarrativeItem(eventId, label, overrides = {}) {
    return {
      eventId,
      summaryKey: overrides.summaryKey || 'behavior.update.component',
      severity: overrides.severity || 's1-notice',
      label,
      heuristicDerived: overrides.heuristicDerived || false,
      ambiguityMarker: overrides.ambiguityMarker || false,
      ruleTrace: overrides.ruleTrace || `trace:${eventId}`,
    };
  }

  it('covers every supported diff event kind without unknown fallback', () => {
    const events = visualDiff.VISUAL_DIFF_CHANGE_KINDS.map((kind, index) =>
      makeEvent(`ev-${index}`, kind)
    );
    const reviewImpact = {
      kind: 'diff-review-impact-result',
      impacts: events.map((event) => makeImpact(event.eventId, event.kind)),
      metadata: {
        totalImpacts: events.length,
        highestSeverity: 's1-notice',
        containsHeuristic: false,
        containsAmbiguity: false,
      },
    };
    const narrative = {
      kind: 'diff-narrative-result',
      groups: [
        makeNarrativeGroup(
          'behavior',
          events.map((event) => makeNarrativeItem(event.eventId, `label:${event.kind}`))
        ),
      ],
      metadata: {
        totalGroups: 1,
        totalItems: events.length,
        highestSeverity: 's1-notice',
        containsAmbiguity: false,
        containsHeuristic: false,
      },
    };

    const result = visualDiff.buildVisualDiffViewModel({
      external: makeExternal(events),
      reviewImpact,
      narrative,
    });

    assert.strictEqual(result.kind, 'visual-diff-view-model/v0');
    assert.deepStrictEqual(
      result.items.map((item) => item.changeKind),
      visualDiff.VISUAL_DIFF_CHANGE_KINDS
    );
    assert.ok(result.items.every((item) => item.label.startsWith('label:')));
  });

  it('preserves heuristic, ambiguity, paths, and evidence references explicitly', () => {
    const event = makeEvent('ev-heuristic', 'remove+add', {
      pairingReason: 'heuristic-similarity',
      fallbackMarker: 'remove-add-fallback',
      previousPath: '/page/components/0',
      nextPath: '/page/components/1',
    });
    const reviewImpact = {
      kind: 'diff-review-impact-result',
      impacts: [
        makeImpact(event.eventId, event.kind, {
          severity: 's3-critical',
          impactAxis: 'ambiguity',
          groupHint: 'ambiguity',
          summaryKey: 'ambiguity.remove-add-fallback',
          heuristicDerived: true,
          ambiguityMarker: true,
        }),
      ],
      metadata: {
        totalImpacts: 1,
        highestSeverity: 's3-critical',
        containsHeuristic: true,
        containsAmbiguity: true,
      },
    };
    const narrative = {
      kind: 'diff-narrative-result',
      groups: [
        makeNarrativeGroup(
          'ambiguity',
          [
            makeNarrativeItem(event.eventId, 'Entity replaced - conservative fallback', {
              severity: 's3-critical',
              heuristicDerived: true,
              ambiguityMarker: true,
              summaryKey: 'ambiguity.remove-add-fallback',
            }),
          ],
          'ambiguity narrative'
        ),
      ],
      metadata: {
        totalGroups: 1,
        totalItems: 1,
        highestSeverity: 's3-critical',
        containsAmbiguity: true,
        containsHeuristic: true,
      },
    };

    const result = visualDiff.buildVisualDiffViewModel({
      external: makeExternal([event]),
      reviewImpact,
      narrative,
    });

    assert.strictEqual(result.items[0].isHeuristic, true);
    assert.strictEqual(result.items[0].isAmbiguous, true);
    assert.strictEqual(result.items[0].beforePath, '/page/components/0');
    assert.strictEqual(result.items[0].afterPath, '/page/components/1');
    assert.strictEqual(result.items[0].evidenceRefs.eventId, 'ev-heuristic');
    assert.strictEqual(result.items[0].evidenceRefs.summaryKey, 'ambiguity.remove-add-fallback');
    assert.strictEqual(result.items[0].evidenceRefs.narrativeAxis, 'ambiguity');
    assert.strictEqual(result.metadata.containsHeuristic, true);
    assert.strictEqual(result.metadata.containsAmbiguity, true);
  });

  it('falls back to rule-trace-derived labels when narrative text is absent for an event', () => {
    const event = makeEvent('ev-no-narrative', 'move');
    const reviewImpact = {
      kind: 'diff-review-impact-result',
      impacts: [
        makeImpact(event.eventId, event.kind, {
          severity: 's2-review',
          impactAxis: 'structure',
          groupHint: 'structure',
          summaryKey: 'structure.move.cross-owner',
          ruleTrace: 'event.kind=move -> structure-move / s2-review / structure',
        }),
      ],
      metadata: {
        totalImpacts: 1,
        highestSeverity: 's2-review',
        containsHeuristic: false,
        containsAmbiguity: false,
      },
    };
    const narrative = {
      kind: 'diff-narrative-result',
      groups: [],
      metadata: {
        totalGroups: 0,
        totalItems: 0,
        highestSeverity: null,
        containsAmbiguity: false,
        containsHeuristic: false,
      },
    };

    const result = visualDiff.buildVisualDiffViewModel({
      external: makeExternal([event]),
      reviewImpact,
      narrative,
    });

    assert.strictEqual(
      result.items[0].label,
      'event.kind=move -> structure-move / s2-review / structure'
    );
    assert.strictEqual(result.groups.length, 0);
  });
});
