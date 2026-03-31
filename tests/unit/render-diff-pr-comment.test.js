/**
 * Unit tests for renderDiffPRComment() (T-20260401-006).
 *
 * Coverage:
 *   - compact mode: signal badge + event count + top N findings present
 *   - full mode: narrative groups + finding table + evidence links present
 *   - deterministic: identical payload + opts → identical string
 *   - maxChars: output fits within limit when specified
 *   - maxChars: truncation notice appended when truncation occurs
 *   - no re-judgment: rendering uses only payload data
 */

'use strict';

const assert = require('assert');
const { renderDiffPRComment } = require('../../out/workflow/diff/pr/render-diff-pr-comment');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeNarrative(groups = []) {
  return {
    kind: 'diff-narrative-result',
    groups,
    metadata: {
      totalGroups: groups.length,
      totalItems: 0,
      highestSeverity: null,
      containsAmbiguity: false,
      containsHeuristic: false,
    },
  };
}

function makeNarrativeGroup(axis, narrative) {
  return {
    axis,
    highestSeverity: 's2-review',
    narrative,
    items: [],
  };
}

function makeFinding(id, kind, entityKind, severity, description) {
  return { eventId: id, kind, entityKind, severity, description };
}

function makePayload(opts = {}) {
  const findings = opts.findings ?? [];
  const highlights = opts.highlights ?? findings.slice(0, 3);
  return {
    kind: 'diff-pr-comment-payload',
    header: {
      signal: opts.signal ?? 'pass',
      totalEvents: opts.totalEvents ?? findings.length,
      criticalCount: opts.criticalCount ?? 0,
      highestSeverity: opts.highestSeverity ?? null,
    },
    highlights,
    findings,
    narrative: opts.narrative ?? makeNarrative(),
    links: opts.links,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('renderDiffPRComment (T-20260401-006)', () => {

  describe('compact mode', () => {
    it('contains signal badge in output', () => {
      const payload = makePayload({ signal: 'pass' });
      const output = renderDiffPRComment(payload, { mode: 'compact' });
      assert.ok(output.includes('PASS'), 'should include PASS signal badge');
    });

    it('contains FAIL badge for fail signal', () => {
      const payload = makePayload({ signal: 'fail' });
      const output = renderDiffPRComment(payload, { mode: 'compact' });
      assert.ok(output.includes('FAIL'));
    });

    it('contains WARN badge for warn signal', () => {
      const payload = makePayload({ signal: 'warn' });
      const output = renderDiffPRComment(payload, { mode: 'compact' });
      assert.ok(output.includes('WARN'));
    });

    it('contains total event count', () => {
      const payload = makePayload({ totalEvents: 7, signal: 'pass' });
      const output = renderDiffPRComment(payload, { mode: 'compact' });
      assert.ok(output.includes('7'));
    });

    it('contains top findings from highlights', () => {
      const findings = [
        makeFinding('e1', 'add', 'component', 's1-notice', 'Entity added'),
        makeFinding('e2', 'remove', 'page', 's2-review', 'Entity removed'),
      ];
      const payload = makePayload({ highlights: findings, findings, totalEvents: 2 });
      const output = renderDiffPRComment(payload, { mode: 'compact' });
      assert.ok(output.includes('e1'));
      assert.ok(output.includes('e2'));
    });

    it('includes critical count when non-zero', () => {
      const payload = makePayload({ signal: 'fail', criticalCount: 2, totalEvents: 3 });
      const output = renderDiffPRComment(payload, { mode: 'compact' });
      assert.ok(output.includes('2') && output.includes('critical'));
    });

    it('returns a string', () => {
      const payload = makePayload();
      const output = renderDiffPRComment(payload, { mode: 'compact' });
      assert.strictEqual(typeof output, 'string');
    });
  });

  describe('full mode', () => {
    it('contains narrative group text', () => {
      const narrative = makeNarrative([
        makeNarrativeGroup('ambiguity', 'Ambiguity group narrative text'),
      ]);
      const payload = makePayload({ narrative, signal: 'fail' });
      const output = renderDiffPRComment(payload, { mode: 'full' });
      assert.ok(output.includes('Ambiguity group narrative text'));
    });

    it('contains finding table with all findings', () => {
      const findings = [
        makeFinding('e1', 'add', 'component', 's1-notice', 'Added component'),
        makeFinding('e2', 'remove', 'page', 's3-critical', 'Removed page'),
      ];
      const payload = makePayload({ findings, highlights: findings, totalEvents: 2 });
      const output = renderDiffPRComment(payload, { mode: 'full' });
      assert.ok(output.includes('e1'));
      assert.ok(output.includes('e2'));
      assert.ok(output.includes('Added component'));
    });

    it('contains evidence links when provided', () => {
      const links = [{ label: 'CI Artifact', href: 'https://ci.example.com/artifact/123' }];
      const payload = makePayload({ links });
      const output = renderDiffPRComment(payload, { mode: 'full' });
      assert.ok(output.includes('CI Artifact'));
      assert.ok(output.includes('https://ci.example.com/artifact/123'));
    });

    it('omits links section when no links provided', () => {
      const payload = makePayload({ links: undefined });
      const output = renderDiffPRComment(payload, { mode: 'full' });
      assert.ok(!output.includes('Evidence Links'));
    });

    it('includes all finding rows for full mode (not just highlights)', () => {
      const findings = Array.from({ length: 10 }, (_, i) =>
        makeFinding(`e${i+1}`, 'add', 'component', 's1-notice', `Finding ${i+1}`)
      );
      const highlights = findings.slice(0, 3);
      const payload = makePayload({ findings, highlights, totalEvents: 10 });
      const output = renderDiffPRComment(payload, { mode: 'full' });
      // All 10 eventIds should appear
      for (let i = 1; i <= 10; i++) {
        assert.ok(output.includes(`e${i}`), `should contain e${i}`);
      }
    });
  });

  describe('determinism', () => {
    it('compact: identical payload → identical output', () => {
      const findings = [
        makeFinding('e1', 'add', 'component', 's1-notice', 'Added'),
        makeFinding('e2', 'remove', 'page', 's2-review', 'Removed'),
      ];
      const payload = makePayload({ findings, highlights: findings, totalEvents: 2, signal: 'warn' });
      const o1 = renderDiffPRComment(payload, { mode: 'compact' });
      const o2 = renderDiffPRComment(payload, { mode: 'compact' });
      assert.strictEqual(o1, o2);
    });

    it('full: identical payload → identical output', () => {
      const findings = [
        makeFinding('e1', 'add', 'component', 's1-notice', 'Added'),
        makeFinding('e2', 'remove', 'page', 's3-critical', 'Removed'),
      ];
      const narrative = makeNarrative([makeNarrativeGroup('structure', 'Structure narrative')]);
      const links = [{ label: 'Artifact', href: 'https://ci.example.com/a' }];
      const payload = makePayload({
        findings, highlights: findings, totalEvents: 2,
        signal: 'fail', narrative, links,
      });
      const o1 = renderDiffPRComment(payload, { mode: 'full' });
      const o2 = renderDiffPRComment(payload, { mode: 'full' });
      assert.strictEqual(o1, o2);
    });
  });

  describe('maxChars', () => {
    it('output fits within maxChars limit', () => {
      const findings = Array.from({ length: 20 }, (_, i) =>
        makeFinding(`e${i+1}`, 'add', 'component', 's1-notice', `Finding description ${i+1}`)
      );
      const payload = makePayload({ findings, highlights: findings.slice(0, 5), totalEvents: 20 });
      const maxChars = 200;
      const output = renderDiffPRComment(payload, { mode: 'compact', maxChars });
      assert.ok(output.length <= maxChars, `output length ${output.length} exceeds maxChars ${maxChars}`);
    });

    it('output without maxChars may exceed same limit', () => {
      const findings = Array.from({ length: 20 }, (_, i) =>
        makeFinding(`e${i+1}`, 'add', 'component', 's1-notice', `Finding description for event number ${i+1}`)
      );
      const payload = makePayload({ findings, highlights: findings, totalEvents: 20 });
      const unlimited = renderDiffPRComment(payload, { mode: 'full' });
      // Sanity: without limit it's longer
      assert.ok(unlimited.length > 200, 'unlimited output should be long enough to test truncation');
    });

    it('appends truncation notice when truncation occurs', () => {
      const findings = Array.from({ length: 30 }, (_, i) =>
        makeFinding(`e${String(i+1).padStart(3,'0')}`, 'add', 'component', 's1-notice',
          `Long description for finding event number ${i+1} with some extra text`)
      );
      const payload = makePayload({ findings, highlights: findings, totalEvents: 30 });
      const maxChars = 300;
      const output = renderDiffPRComment(payload, { mode: 'full', maxChars });
      assert.ok(output.length <= maxChars);
      assert.ok(output.includes('truncated'));
    });

    it('full mode: output fits within maxChars', () => {
      const findings = Array.from({ length: 15 }, (_, i) =>
        makeFinding(`e${i+1}`, 'remove', 'component', 's2-review', `Removed component ${i+1}`)
      );
      const narrative = makeNarrative([makeNarrativeGroup('structure', 'Structure group narrative text here')]);
      const payload = makePayload({ findings, highlights: findings.slice(0,3), totalEvents: 15, narrative });
      const maxChars = 400;
      const output = renderDiffPRComment(payload, { mode: 'full', maxChars });
      assert.ok(output.length <= maxChars, `output length ${output.length} exceeds maxChars ${maxChars}`);
    });

    it('no truncation when output fits within maxChars', () => {
      const payload = makePayload({ signal: 'pass', totalEvents: 0 });
      const output = renderDiffPRComment(payload, { mode: 'compact', maxChars: 10000 });
      assert.ok(!output.includes('truncated'));
    });
  });

  describe('no re-judgment', () => {
    it('rendering does not call any classification or rule functions', () => {
      // Test that signal in output matches payload.header.signal verbatim
      // even when findings suggest a different severity
      const findings = [makeFinding('e1', 'remove+add', 'component', 's3-critical', 'critical')];
      const payload = makePayload({ findings, highlights: findings, signal: 'pass', totalEvents: 1 });
      const output = renderDiffPRComment(payload, { mode: 'compact' });
      // The signal badge should be PASS as specified in header, not computed from findings
      assert.ok(output.includes('PASS'));
      assert.ok(!output.includes('FAIL'));
    });
  });
});
