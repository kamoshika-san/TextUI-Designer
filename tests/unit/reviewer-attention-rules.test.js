'use strict';

const assert = require('assert');

describe('reviewer attention rules (M2-2)', () => {
  let attention;

  before(() => {
    attention = require('../../out/core/textui-reviewer-attention');
  });

  function makeImpact(overrides = {}) {
    return {
      eventId: 'event:test',
      sourceEventKind: 'update',
      sourceEntityKind: 'component',
      category: 'behavior-update',
      severity: 's1-notice',
      impactAxis: 'behavior',
      summaryKey: 'behavior.update.component',
      groupHint: 'behavior',
      heuristicDerived: false,
      ambiguityMarker: false,
      ruleTrace: 'test',
      ...overrides,
    };
  }

  function makeTrace(overrides = {}) {
    return {
      eventId: 'event:test',
      eventKind: 'update',
      pairingClass: 'deterministic',
      identitySource: 'explicit-id',
      pairingReason: 'deterministic-explicit-id',
      fallbackMarker: 'none',
      fallbackConfidence: 'not-applicable',
      reasonSummary: 'test',
      hasFallback: false,
      ...overrides,
    };
  }

  it('ambiguityMarker=true -> critical', () => {
    const result = attention.classifyReviewerAttention(
      makeImpact({ ambiguityMarker: true, heuristicDerived: true, severity: 's3-critical' }),
      makeTrace({ fallbackMarker: 'remove-add-fallback', hasFallback: true })
    );
    assert.strictEqual(result, 'critical');
  });

  it('heuristicDerived=true + severity=s2-review -> review-required', () => {
    const result = attention.classifyReviewerAttention(
      makeImpact({ heuristicDerived: true, severity: 's2-review' }),
      makeTrace({ pairingClass: 'heuristic', pairingReason: 'heuristic-similarity' })
    );
    assert.strictEqual(result, 'review-required');
  });

  it('heuristicDerived=true + severity=s1-notice -> none', () => {
    const result = attention.classifyReviewerAttention(
      makeImpact({ heuristicDerived: true, severity: 's1-notice' }),
      makeTrace({ pairingClass: 'heuristic', pairingReason: 'heuristic-similarity' })
    );
    assert.strictEqual(result, 'none');
  });

  it('fallbackMarker=remove-add-fallback -> fallback-applied', () => {
    const result = attention.classifyReviewerAttention(
      makeImpact(),
      makeTrace({ fallbackMarker: 'remove-add-fallback', hasFallback: true })
    );
    assert.strictEqual(result, 'fallback-applied');
  });

  it('pairingClass=heuristic + rejectedBy=forbidden-zone -> heuristic-rejected', () => {
    const result = attention.classifyReviewerAttention(
      makeImpact(),
      makeTrace({
        pairingClass: 'heuristic',
        pairingReason: 'heuristic-similarity',
        heuristicTrace: {
          attempted: true,
          accepted: false,
          rejectedBy: 'forbidden-zone',
        },
      })
    );
    assert.strictEqual(result, 'heuristic-rejected');
  });

  it('plain heuristic accept below review threshold -> none', () => {
    const result = attention.classifyReviewerAttention(
      makeImpact({ heuristicDerived: true, severity: 's1-notice' }),
      makeTrace({
        pairingClass: 'heuristic',
        pairingReason: 'heuristic-similarity',
        heuristicTrace: {
          attempted: true,
          accepted: true,
          totalScore: 3,
        },
      })
    );
    assert.strictEqual(result, 'none');
  });
});
