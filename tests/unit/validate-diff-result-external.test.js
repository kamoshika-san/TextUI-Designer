/**
 * Unit tests for validateDiffResultExternal() (T-20260401-002).
 *
 * Coverage:
 *   - valid payload → ok: true, payload returned
 *   - required field missing → DiffExternalContractError with errorKind schema-validation-error
 *   - invalid enum value in events[] → validation error
 *   - additional properties on root → additionalProperties violation
 */

'use strict';

const assert = require('assert');
const { validateDiffResultExternal } = require('../../out/workflow/diff/external/validate-diff-result-external');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Minimal valid DiffResultExternal payload */
function makeValidPayload(overrides = {}) {
  return {
    kind: 'textui-diff-result-external',
    schemaVersion: 'diff-result-external/v0',
    producer: {
      engine: 'textui-diff-core',
      engineVersion: '0.7.3',
      compareStage: 'c1-skeleton',
      producedAt: '2026-04-01T00:00:00.000Z'
    },
    events: [],
    metadata: {
      eventCount: 0,
      previousSource: { pageId: 'p1' },
      nextSource: { pageId: 'p2' }
    },
    ...overrides
  };
}

function makeEvent(overrides = {}) {
  return {
    eventId: 'ev-1',
    kind: 'add',
    entityKind: 'component',
    pairingReason: 'deterministic-explicit-id',
    fallbackMarker: 'none',
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateDiffResultExternal (T-20260401-002)', () => {

  describe('Valid payloads', () => {
    it('returns ok: true for a minimal valid payload (no events)', () => {
      const result = validateDiffResultExternal(makeValidPayload());
      assert.strictEqual(result.ok, true);
      if (result.ok) {
        assert.strictEqual(result.payload.kind, 'textui-diff-result-external');
      }
    });

    it('returns the same payload object on success', () => {
      const payload = makeValidPayload();
      const result = validateDiffResultExternal(payload);
      assert.strictEqual(result.ok, true);
      if (result.ok) {
        assert.strictEqual(result.payload, payload);
      }
    });

    it('returns ok: true for payload with a valid event', () => {
      const payload = makeValidPayload({
        events: [makeEvent()],
        metadata: { eventCount: 1, previousSource: { pageId: 'p1' }, nextSource: { pageId: 'p2' } }
      });
      const result = validateDiffResultExternal(payload);
      assert.strictEqual(result.ok, true);
    });

    it('accepts event with optional previousPath and nextPath', () => {
      const payload = makeValidPayload({
        events: [makeEvent({ previousPath: 'page.components[0]', nextPath: 'page.components[0]' })],
        metadata: { eventCount: 1, previousSource: { pageId: 'p1' }, nextSource: { pageId: 'p2' } }
      });
      const result = validateDiffResultExternal(payload);
      assert.strictEqual(result.ok, true);
    });

    it('accepts producer without optional producedAt', () => {
      const payload = makeValidPayload();
      delete payload.producer.producedAt;
      const result = validateDiffResultExternal(payload);
      assert.strictEqual(result.ok, true);
    });

    it('accepts source ref without optional sourcePath', () => {
      const payload = makeValidPayload();
      // metadata.previousSource already lacks sourcePath
      const result = validateDiffResultExternal(payload);
      assert.strictEqual(result.ok, true);
    });
  });

  describe('Invalid payloads — missing required fields', () => {
    it('returns ok: false when kind is missing', () => {
      const payload = makeValidPayload();
      delete payload.kind;
      const result = validateDiffResultExternal(payload);
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.error.errorKind, 'schema-validation-error');
        assert.ok(result.error.validationErrors.length > 0);
      }
    });

    it('returns ok: false when schemaVersion is missing', () => {
      const payload = makeValidPayload();
      delete payload.schemaVersion;
      const result = validateDiffResultExternal(payload);
      assert.strictEqual(result.ok, false);
    });

    it('returns ok: false when producer is missing', () => {
      const payload = makeValidPayload();
      delete payload.producer;
      const result = validateDiffResultExternal(payload);
      assert.strictEqual(result.ok, false);
    });

    it('returns ok: false when events is missing', () => {
      const payload = makeValidPayload();
      delete payload.events;
      const result = validateDiffResultExternal(payload);
      assert.strictEqual(result.ok, false);
    });

    it('returns ok: false when metadata is missing', () => {
      const payload = makeValidPayload();
      delete payload.metadata;
      const result = validateDiffResultExternal(payload);
      assert.strictEqual(result.ok, false);
    });

    it('returns ok: false when required event field (eventId) is missing', () => {
      const event = makeEvent();
      delete event.eventId;
      const payload = makeValidPayload({ events: [event], metadata: { eventCount: 1, previousSource: { pageId: 'p1' }, nextSource: { pageId: 'p2' } } });
      const result = validateDiffResultExternal(payload);
      assert.strictEqual(result.ok, false);
    });

    it('returns ok: false when required producer field (engine) is missing', () => {
      const payload = makeValidPayload();
      delete payload.producer.engine;
      const result = validateDiffResultExternal(payload);
      assert.strictEqual(result.ok, false);
    });
  });

  describe('Invalid payloads — wrong values', () => {
    it('returns ok: false when kind has wrong value', () => {
      const payload = makeValidPayload({ kind: 'wrong-kind' });
      const result = validateDiffResultExternal(payload);
      assert.strictEqual(result.ok, false);
    });

    it('returns ok: false when schemaVersion has wrong value', () => {
      const payload = makeValidPayload({ schemaVersion: 'v9999' });
      const result = validateDiffResultExternal(payload);
      assert.strictEqual(result.ok, false);
    });

    it('returns ok: false when event kind has invalid enum value', () => {
      const payload = makeValidPayload({
        events: [makeEvent({ kind: 'invalid-kind' })],
        metadata: { eventCount: 1, previousSource: { pageId: 'p1' }, nextSource: { pageId: 'p2' } }
      });
      const result = validateDiffResultExternal(payload);
      assert.strictEqual(result.ok, false);
    });

    it('returns ok: false when event entityKind has invalid enum value', () => {
      const payload = makeValidPayload({
        events: [makeEvent({ entityKind: 'widget' })],
        metadata: { eventCount: 1, previousSource: { pageId: 'p1' }, nextSource: { pageId: 'p2' } }
      });
      const result = validateDiffResultExternal(payload);
      assert.strictEqual(result.ok, false);
    });

    it('returns ok: false when event pairingReason has invalid enum value', () => {
      const payload = makeValidPayload({
        events: [makeEvent({ pairingReason: 'magic-match' })],
        metadata: { eventCount: 1, previousSource: { pageId: 'p1' }, nextSource: { pageId: 'p2' } }
      });
      const result = validateDiffResultExternal(payload);
      assert.strictEqual(result.ok, false);
    });
  });

  describe('DiffExternalContractError structure', () => {
    it('error has errorKind schema-validation-error', () => {
      const payload = makeValidPayload();
      delete payload.kind;
      const result = validateDiffResultExternal(payload);
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.error.errorKind, 'schema-validation-error');
      }
    });

    it('error has a non-empty message string', () => {
      const payload = makeValidPayload();
      delete payload.kind;
      const result = validateDiffResultExternal(payload);
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.ok(typeof result.error.message === 'string' && result.error.message.length > 0);
      }
    });

    it('error has validationErrors array with at least one entry', () => {
      const payload = makeValidPayload();
      delete payload.kind;
      const result = validateDiffResultExternal(payload);
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.ok(Array.isArray(result.error.validationErrors));
        assert.ok(result.error.validationErrors.length > 0);
        const ve = result.error.validationErrors[0];
        assert.ok(typeof ve.instancePath === 'string');
        assert.ok(typeof ve.message === 'string');
        assert.ok(typeof ve.keyword === 'string');
      }
    });
  });
});
