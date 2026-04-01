const assert = require('assert');

describe('merge preview api', () => {
  let diff;
  let buildThreeWayModule;
  let mergePolicyModule;
  let previewApi;
  let originalBuildThreeWayDiffResult;
  let originalEvaluateMergePolicy;

  function makeDocument(dsl, side, sourcePath) {
    return diff.createNormalizedDiffDocument(dsl, { side, sourcePath });
  }

  before(() => {
    diff = require('../../out/core/textui-core-diff');
    buildThreeWayModule = require('../../out/core/three-way/build-three-way-diff');
    mergePolicyModule = require('../../out/core/three-way/merge-policy');
    originalBuildThreeWayDiffResult = buildThreeWayModule.buildThreeWayDiffResult;
    originalEvaluateMergePolicy = mergePolicyModule.evaluateMergePolicy;
    previewApi = require('../../out/core/three-way/preview-api');
  });

  afterEach(() => {
    buildThreeWayModule.buildThreeWayDiffResult = originalBuildThreeWayDiffResult;
    mergePolicyModule.evaluateMergePolicy = originalEvaluateMergePolicy;
  });

  it('emits mergedDsl when no manual-review conflict remains', () => {
    const base = makeDocument({
      page: {
        id: 'page-1',
        title: 'Base',
        layout: 'vertical',
        components: [{ Text: { value: 'Hello', variant: 'p' } }],
      },
    }, 'previous', 'base.tui.yml');
    const left = makeDocument({
      page: {
        id: 'page-1',
        title: 'Left title',
        layout: 'vertical',
        components: [{ Text: { value: 'Hello', variant: 'p' } }],
      },
    }, 'next', 'left.tui.yml');
    const right = makeDocument({
      page: {
        id: 'page-1',
        title: 'Base',
        layout: 'horizontal',
        components: [{ Text: { value: 'Hello', variant: 'p' } }],
      },
    }, 'next', 'right.tui.yml');

    const realThreeWayResult = originalBuildThreeWayDiffResult({ base, left, right });
    buildThreeWayModule.buildThreeWayDiffResult = () => ({
      ...realThreeWayResult,
      conflicts: [],
      metadata: {
        ...realThreeWayResult.metadata,
        conflictCount: 0,
      },
    });

    const result = previewApi.buildMergePreview({
      base,
      left,
      right,
      mode: 'safe-only',
    });

    assert.ok(result.mergedDsl);
    assert.strictEqual(result.mergedDsl.page.title, 'Left title');
    assert.strictEqual(result.mergedDsl.page.layout, 'horizontal');
    assert.deepStrictEqual(result.conflicts, []);
    assert.deepStrictEqual(result.previewPatches, []);
  });

  it('keeps mergedDsl absent when any manual-review conflict remains and exposes all conflicts in with-conflicts mode', () => {
    const fakeConflict = {
      conflictId: 'conflict:1',
      type: 'rename-vs-replace',
      severity: 's3-critical',
      entityKey: 'component:Text:item-1',
      leftEventIds: ['event:left'],
      rightEventIds: ['event:right'],
      evidence: {
        left: {
          eventId: 'event:left',
          eventKind: 'rename',
          pairingReason: 'deterministic-explicit-id',
          fallbackMarker: 'none',
          path: '/page/components/0',
          sourceRef: { side: 'next', entityPath: '/page/components/0' },
        },
        right: {
          eventId: 'event:right',
          eventKind: 'remove+add',
          pairingReason: 'unpaired',
          fallbackMarker: 'remove-add-fallback',
          path: '/page/components/0',
          sourceRef: { side: 'next', entityPath: '/page/components/0' },
        },
      },
      resolutionHint: 'manual-review-required',
      status: 'candidate',
      matchingBasis: 'entity-key-and-trace',
      taxonomy: {
        family: 'structural-conflict',
        type: 'rename-vs-replace',
        impactAxis: 'structure',
        summaryKey: 'structure.conflict.rename-vs-replace',
        ruleTrace: 'taxonomy',
      },
    };

    buildThreeWayModule.buildThreeWayDiffResult = () => ({
      kind: 'textui-three-way-diff-result',
      input: {},
      leftDiff: { events: [], input: {} },
      rightDiff: { events: [], input: {} },
      conflicts: [fakeConflict],
      metadata: {
        schemaVersion: 'three-way-diff/v0',
        conflictCount: 1,
      },
    });
    mergePolicyModule.evaluateMergePolicy = () => ([{
      decision: 'manual-review-required',
      reason: 'divergent-identity',
      explanationKey: 'merge.manual.divergent-identity',
      ruleTrace: 'manual',
    }]);

    const result = previewApi.buildMergePreview({
      base: {},
      left: {},
      right: {},
      mode: 'with-conflicts',
    });

    assert.strictEqual(result.mergedDsl, undefined);
    assert.strictEqual(result.conflicts.length, 1);
    assert.strictEqual(result.conflicts[0].resolutionHint, 'manual-review-required');
    assert.deepStrictEqual(result.previewPatches, [{
      path: '/page/components/0',
      op: 'replace',
      from: { path: '/page/components/0', eventId: 'event:left' },
      to: { path: '/page/components/0', eventId: 'event:right' },
    }]);
  });

  it('filters response conflicts down to the safe lane in safe-only mode', () => {
    const safeConflict = {
      conflictId: 'conflict:safe',
      type: 'same-property-different-value',
      severity: 's1-notice',
      entityKey: 'property:/page/props/title',
      leftEventIds: ['event:left'],
      rightEventIds: ['event:right'],
      evidence: {
        left: {
          eventId: 'event:left',
          eventKind: 'update',
          pairingReason: 'deterministic-structural-path',
          fallbackMarker: 'none',
          path: '/page/props/title',
          sourceRef: { side: 'next', entityPath: '/page/props/title' },
        },
        right: {
          eventId: 'event:right',
          eventKind: 'update',
          pairingReason: 'deterministic-structural-path',
          fallbackMarker: 'none',
          path: '/page/props/title',
          sourceRef: { side: 'next', entityPath: '/page/props/title' },
        },
      },
      resolutionHint: 'auto-merge-safe',
      status: 'candidate',
      matchingBasis: 'entity-key-and-trace',
      taxonomy: {
        family: 'semantic-conflict',
        type: 'same-property-different-value',
        impactAxis: 'presentation',
        summaryKey: 'presentation.conflict.same-property-different-value',
        ruleTrace: 'taxonomy',
      },
    };
    const manualConflict = {
      ...safeConflict,
      conflictId: 'conflict:manual',
      type: 'rename-vs-replace',
      taxonomy: {
        family: 'structural-conflict',
        type: 'rename-vs-replace',
        impactAxis: 'structure',
        summaryKey: 'structure.conflict.rename-vs-replace',
        ruleTrace: 'taxonomy',
      },
    };

    buildThreeWayModule.buildThreeWayDiffResult = () => ({
      kind: 'textui-three-way-diff-result',
      input: {},
      leftDiff: { events: [], input: {} },
      rightDiff: { events: [], input: {} },
      conflicts: [safeConflict, manualConflict],
      metadata: {
        schemaVersion: 'three-way-diff/v0',
        conflictCount: 2,
      },
    });
    mergePolicyModule.evaluateMergePolicy = () => ([
      {
        decision: 'auto-merge-safe',
        reason: 'non-overlap',
        explanationKey: 'merge.safe.non-overlap',
        ruleTrace: 'safe',
      },
      {
        decision: 'manual-review-required',
        reason: 'divergent-identity',
        explanationKey: 'merge.manual.divergent-identity',
        ruleTrace: 'manual',
      },
    ]);

    const result = previewApi.buildMergePreview({
      base: {},
      left: {},
      right: {},
      mode: 'safe-only',
    });

    assert.strictEqual(result.mergedDsl, undefined);
    assert.strictEqual(result.conflicts.length, 1);
    assert.strictEqual(result.conflicts[0].conflictId, 'conflict:safe');
    assert.deepStrictEqual(result.previewPatches, [{
      path: '/page/props/title',
      op: 'replace',
      from: { path: '/page/props/title', eventId: 'event:left' },
      to: { path: '/page/props/title', eventId: 'event:right' },
    }]);
  });
});
