/**
 * Unit tests for buildDiffPRCommentPayload() (T-20260401-005).
 *
 * Coverage:
 *   - Full input → payload structure validation (kind, header, highlights, findings, narrative)
 *   - narrative passed through verbatim (not re-interpreted)
 *   - links optional — absent when not provided
 *   - links present when provided
 *   - highlights are top N by severity (descending), deterministic by eventId
 *   - header.signal comes from opts.signal (not re-computed)
 *   - header.totalEvents from external.metadata.eventCount
 *   - header.criticalCount correct
 *   - header.highestSeverity from refinedImpact.metadata
 *   - findings preserve external event order
 */

'use strict';

const assert = require('assert');
const { buildDiffPRCommentPayload } = require('../../out/workflow/diff/pr/build-diff-pr-comment-payload');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeExternal(events = []) {
  return {
    kind: 'textui-diff-result-external',
    schemaVersion: 'diff-result-external/v0',
    producer: {
      engine: 'textui-diff-core',
      engineVersion: '0.7.3',
      compareStage: 'c1-skeleton',
      producedAt: '2026-04-01T00:00:00.000Z',
    },
    events,
    metadata: {
      eventCount: events.length,
      previousSource: { pageId: 'p1' },
      nextSource: { pageId: 'p2' },
    },
  };
}

function makeExternalEvent(id, kind, entityKind, opts = {}) {
  return {
    eventId: id,
    kind,
    entityKind,
    pairingReason: opts.pairingReason ?? 'deterministic-explicit-id',
    fallbackMarker: opts.fallbackMarker ?? 'none',
  };
}

function makeImpact(eventId, severity, opts = {}) {
  return {
    eventId,
    sourceEventKind: opts.kind ?? 'update',
    sourceEntityKind: opts.entityKind ?? 'component',
    category: opts.category ?? 'behavior-update',
    severity,
    impactAxis: opts.axis ?? 'behavior',
    summaryKey: opts.summaryKey ?? 'behavior.update.component',
    groupHint: opts.axis ?? 'behavior',
    heuristicDerived: opts.heuristicDerived ?? false,
    ambiguityMarker: opts.ambiguityMarker ?? false,
    ruleTrace: opts.ruleTrace ?? `rule for ${eventId}`,
  };
}

function makeRefinedImpact(impacts, opts = {}) {
  const severityRank = { 's3-critical': 3, 's2-review': 2, 's1-notice': 1, 's0-minor': 0 };
  const highestSeverity = impacts.length === 0
    ? null
    : impacts.reduce((best, i) => {
        return severityRank[i.severity] > severityRank[best] ? i.severity : best;
      }, impacts[0].severity);

  return {
    kind: 'diff-review-impact-result',
    impacts,
    metadata: {
      totalImpacts: impacts.length,
      highestSeverity: opts.highestSeverity ?? highestSeverity,
      containsHeuristic: impacts.some(i => i.heuristicDerived),
      containsAmbiguity: impacts.some(i => i.ambiguityMarker),
    },
  };
}

function makeNarrative(groups = []) {
  return {
    kind: 'diff-narrative-result',
    groups,
    metadata: {
      totalGroups: groups.length,
      totalItems: groups.reduce((s, g) => s + g.items.length, 0),
      highestSeverity: null,
      containsAmbiguity: false,
      containsHeuristic: false,
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildDiffPRCommentPayload (T-20260401-005)', () => {

  describe('Result structure', () => {
    it('returns kind: diff-pr-comment-payload', () => {
      const external = makeExternal([]);
      const refined = makeRefinedImpact([]);
      const narrative = makeNarrative();
      const result = buildDiffPRCommentPayload({
        external, reviewImpact: refined, refinedImpact: refined, narrative, signal: 'pass',
      });
      assert.strictEqual(result.kind, 'diff-pr-comment-payload');
    });

    it('contains header, highlights, findings, narrative fields', () => {
      const external = makeExternal([]);
      const refined = makeRefinedImpact([]);
      const narrative = makeNarrative();
      const result = buildDiffPRCommentPayload({
        external, reviewImpact: refined, refinedImpact: refined, narrative, signal: 'pass',
      });
      assert.ok('header' in result);
      assert.ok('highlights' in result);
      assert.ok('findings' in result);
      assert.ok('narrative' in result);
    });
  });

  describe('header', () => {
    it('header.signal comes from opts.signal (not re-computed)', () => {
      const external = makeExternal([]);
      const refined = makeRefinedImpact([]);
      const narrative = makeNarrative();

      const rPass = buildDiffPRCommentPayload({
        external, reviewImpact: refined, refinedImpact: refined, narrative, signal: 'pass',
      });
      const rFail = buildDiffPRCommentPayload({
        external, reviewImpact: refined, refinedImpact: refined, narrative, signal: 'fail',
      });
      assert.strictEqual(rPass.header.signal, 'pass');
      assert.strictEqual(rFail.header.signal, 'fail');
    });

    it('header.totalEvents from external.metadata.eventCount', () => {
      const external = makeExternal([
        makeExternalEvent('e1', 'add', 'component'),
        makeExternalEvent('e2', 'remove', 'page'),
      ]);
      const refined = makeRefinedImpact([
        makeImpact('e1', 's1-notice'),
        makeImpact('e2', 's2-review'),
      ]);
      const result = buildDiffPRCommentPayload({
        external, reviewImpact: refined, refinedImpact: refined, narrative: makeNarrative(), signal: 'warn',
      });
      assert.strictEqual(result.header.totalEvents, 2);
    });

    it('header.criticalCount counts s3-critical events (remove+add)', () => {
      const external = makeExternal([
        makeExternalEvent('e1', 'remove+add', 'component', { fallbackMarker: 'remove-add-fallback' }),
        makeExternalEvent('e2', 'add', 'component'),
      ]);
      const refined = makeRefinedImpact([
        makeImpact('e1', 's3-critical', { ambiguityMarker: true }),
        makeImpact('e2', 's1-notice'),
      ]);
      const result = buildDiffPRCommentPayload({
        external, reviewImpact: refined, refinedImpact: refined, narrative: makeNarrative(), signal: 'fail',
      });
      assert.strictEqual(result.header.criticalCount, 1);
    });

    it('header.highestSeverity comes from refinedImpact.metadata', () => {
      const external = makeExternal([makeExternalEvent('e1', 'update', 'component')]);
      const refined = makeRefinedImpact([makeImpact('e1', 's3-critical')], { highestSeverity: 's3-critical' });
      const result = buildDiffPRCommentPayload({
        external, reviewImpact: refined, refinedImpact: refined, narrative: makeNarrative(), signal: 'fail',
      });
      assert.strictEqual(result.header.highestSeverity, 's3-critical');
    });

    it('header.highestSeverity null for empty findings', () => {
      const external = makeExternal([]);
      const refined = makeRefinedImpact([]);
      const result = buildDiffPRCommentPayload({
        external, reviewImpact: refined, refinedImpact: refined, narrative: makeNarrative(), signal: 'pass',
      });
      assert.strictEqual(result.header.highestSeverity, null);
    });
  });

  describe('narrative passthrough', () => {
    it('narrative is passed through verbatim', () => {
      const narrative = makeNarrative([{
        axis: 'ambiguity',
        highestSeverity: 's3-critical',
        narrative: 'test narrative text',
        items: [],
      }]);
      const external = makeExternal([]);
      const refined = makeRefinedImpact([]);
      const result = buildDiffPRCommentPayload({
        external, reviewImpact: refined, refinedImpact: refined, narrative, signal: 'fail',
      });
      assert.strictEqual(result.narrative, narrative);
      assert.strictEqual(result.narrative.groups[0].narrative, 'test narrative text');
    });

    it('narrative is the exact same object reference (not a copy)', () => {
      const narrative = makeNarrative();
      const external = makeExternal([]);
      const refined = makeRefinedImpact([]);
      const result = buildDiffPRCommentPayload({
        external, reviewImpact: refined, refinedImpact: refined, narrative, signal: 'pass',
      });
      assert.strictEqual(result.narrative, narrative);
    });
  });

  describe('links optional', () => {
    it('links absent from payload when not provided', () => {
      const external = makeExternal([]);
      const refined = makeRefinedImpact([]);
      const result = buildDiffPRCommentPayload({
        external, reviewImpact: refined, refinedImpact: refined, narrative: makeNarrative(), signal: 'pass',
      });
      assert.ok(!('links' in result) || result.links === undefined);
    });

    it('links present in payload when provided', () => {
      const external = makeExternal([]);
      const refined = makeRefinedImpact([]);
      const links = [{ label: 'Artifact', href: 'https://ci.example.com/artifact' }];
      const result = buildDiffPRCommentPayload({
        external, reviewImpact: refined, refinedImpact: refined,
        narrative: makeNarrative(), signal: 'pass', links,
      });
      assert.ok(Array.isArray(result.links));
      assert.strictEqual(result.links[0].label, 'Artifact');
    });
  });

  describe('findings order', () => {
    it('findings preserve external event order', () => {
      const external = makeExternal([
        makeExternalEvent('e1', 'add', 'component'),
        makeExternalEvent('e2', 'remove', 'page'),
        makeExternalEvent('e3', 'update', 'property'),
      ]);
      const refined = makeRefinedImpact([
        makeImpact('e1', 's1-notice'),
        makeImpact('e2', 's2-review'),
        makeImpact('e3', 's0-minor'),
      ]);
      const result = buildDiffPRCommentPayload({
        external, reviewImpact: refined, refinedImpact: refined, narrative: makeNarrative(), signal: 'warn',
      });
      const ids = result.findings.map(f => f.eventId);
      assert.deepStrictEqual(ids, ['e1', 'e2', 'e3']);
    });
  });

  describe('highlights', () => {
    it('highlights default top 5 by severity descending', () => {
      const events = ['e1','e2','e3','e4','e5','e6'].map(id =>
        makeExternalEvent(id, 'update', 'component')
      );
      const external = makeExternal(events);
      const severities = ['s0-minor','s1-notice','s2-review','s3-critical','s1-notice','s2-review'];
      const impacts = events.map((e, i) => makeImpact(e.eventId, severities[i]));
      const refined = makeRefinedImpact(impacts);
      const result = buildDiffPRCommentPayload({
        external, reviewImpact: refined, refinedImpact: refined, narrative: makeNarrative(), signal: 'fail',
      });
      assert.strictEqual(result.highlights.length, 5);
      // First highlight must be the s3-critical one
      assert.strictEqual(result.highlights[0].severity, 's3-critical');
    });

    it('highlights respect custom highlightCount', () => {
      const events = ['e1','e2','e3'].map(id => makeExternalEvent(id, 'add', 'component'));
      const external = makeExternal(events);
      const impacts = events.map(e => makeImpact(e.eventId, 's1-notice'));
      const refined = makeRefinedImpact(impacts);
      const result = buildDiffPRCommentPayload({
        external, reviewImpact: refined, refinedImpact: refined,
        narrative: makeNarrative(), signal: 'pass', highlightCount: 2,
      });
      assert.strictEqual(result.highlights.length, 2);
    });

    it('highlights are deterministic: same eventId order for same severity', () => {
      const events = ['e2','e1','e3'].map(id => makeExternalEvent(id, 'add', 'component'));
      const external = makeExternal(events);
      const impacts = events.map(e => makeImpact(e.eventId, 's1-notice'));
      const refined = makeRefinedImpact(impacts);
      const r1 = buildDiffPRCommentPayload({
        external, reviewImpact: refined, refinedImpact: refined,
        narrative: makeNarrative(), signal: 'pass',
      });
      const r2 = buildDiffPRCommentPayload({
        external, reviewImpact: refined, refinedImpact: refined,
        narrative: makeNarrative(), signal: 'pass',
      });
      assert.deepStrictEqual(r1.highlights.map(h => h.eventId), r2.highlights.map(h => h.eventId));
    });
  });
});
