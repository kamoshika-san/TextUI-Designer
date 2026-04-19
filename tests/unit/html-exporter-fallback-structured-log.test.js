/**
 * T-022: CI contract for HtmlExporter fallback lane **structured** debug log.
 * If the log shape or stable event id regresses, this file fails fast (grep / aggregation rely on it).
 */
const assert = require('assert');
const {
  HtmlExporter,
  TEXTUI_HTML_EXPORTER_FALLBACK_LANE_EVENT_ID
} = require('../../out/exporters/html-exporter');
const { createFallbackOptions } = require('../helpers/fallback-helper');

describe('HtmlExporter fallback structured log (T-022)', () => {
  const dsl = {
    page: {
      components: [{ Text: { value: 'structured log contract' } }]
    }
  };

  let originalLevel;

  beforeEach(() => {
    originalLevel = process.env.TEXTUI_LOG_LEVEL;
    process.env.TEXTUI_LOG_LEVEL = 'debug';
  });

  afterEach(() => {
    if (originalLevel === undefined) {
      delete process.env.TEXTUI_LOG_LEVEL;
    } else {
      process.env.TEXTUI_LOG_LEVEL = originalLevel;
    }
  });

  it('passes a stable kind payload to logger.debug on the internal fallback lane', async () => {
    const calls = [];

    const exporter = new HtmlExporter();
    const originalDebug = exporter.logger.debug.bind(exporter.logger);
    exporter.logger.debug = (message, ...args) => {
      calls.push({ message, args });
      originalDebug(message, ...args);
    };

    await exporter.export(dsl, createFallbackOptions({ format: 'html' }));

    assert.ok(calls.length >= 1, 'expected at least one debug call on fallback export');
    const hit = calls.find(
      (c) =>
        typeof c.message === 'string' &&
        c.message.includes(TEXTUI_HTML_EXPORTER_FALLBACK_LANE_EVENT_ID) &&
        c.message.includes('T-022')
    );
    assert.ok(hit, 'message must include stable event id and T-022 marker for CI grep');

    const payload = hit.args[0];
    assert.ok(payload && typeof payload === 'object', 'structured payload must be first rest arg');
    assert.strictEqual(payload.kind, TEXTUI_HTML_EXPORTER_FALLBACK_LANE_EVENT_ID);
    assert.strictEqual(payload.lane, 'fallback');
    assert.strictEqual(payload.useReactRender, false);
    assert.strictEqual(payload.ticket, 'T-022');
  });
});
