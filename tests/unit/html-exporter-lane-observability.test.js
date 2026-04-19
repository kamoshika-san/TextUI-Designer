/**
 * HtmlExporter lane observability (debug / deprecation signals).
 *
 * T-016 / T-019: These tests intentionally exercise the **fallback HTML lane** (via
 * `createFallbackOptions`) or assert the **runtime hard gate** for raw `useReactRender:false`.
 * They complement `html-exporter-fallback-style-lane.test.js` (markup/CSS) and cannot be merged there
 * without mixing unrelated assertions.
 */
const assert = require('assert');
const { HtmlExporter } = require('../../out/exporters/html-exporter');
const { createFallbackOptions } = require('../helpers/fallback-helper');

describe('HtmlExporter lane observability', () => {
  const dsl = {
    page: {
      components: [{ Text: { value: 'lane check' } }]
    }
  };

  let originalLevel;
  let originalWrite;
  let originalConsoleWarn;

  beforeEach(() => {
    originalLevel = process.env.TEXTUI_LOG_LEVEL;
    originalWrite = process.stdout.write;
    originalConsoleWarn = console.warn;
  });

  afterEach(() => {
    if (originalLevel === undefined) {
      delete process.env.TEXTUI_LOG_LEVEL;
    } else {
      process.env.TEXTUI_LOG_LEVEL = originalLevel;
    }
    process.stdout.write = originalWrite;
    console.warn = originalConsoleWarn;
  });

  // Fallback-only: Primary lane must not emit the fallback debug string (see sibling test below).
  it('emits a debug log only for the internal fallback lane when debug logging is enabled', async () => {
    process.env.TEXTUI_LOG_LEVEL = 'debug';
    const logs = [];

    const exporter = new HtmlExporter();
    const originalDebug = exporter.logger.debug.bind(exporter.logger);
    exporter.logger.debug = (message, ...args) => {
      logs.push(message);
      originalDebug(message, ...args);
    };

    await exporter.export(dsl, createFallbackOptions({ format: 'html' }));

    assert.ok(
      logs.some(message => message.includes('using fallback HTML render path (useReactRender=false)')),
      'fallback lane should be observable through a dedicated debug log'
    );
  });

  // Raw `useReactRender:false` must hit the T-019 runtime hard gate (no internal flag).
  it('throws when a public caller requests the fallback lane directly', async () => {
    const exporter = new HtmlExporter();
    await assert.rejects(
      async () => exporter.export(dsl, { format: 'html', useReactRender: false }),
      (err) =>
        err instanceof Error &&
        err.message.includes('[HtmlExporter:FALLBACK_BLOCKED]') &&
        err.message.includes('__internalLegacyFallback')
    );
  });

  // Primary control: same debug instrumentation must stay silent without fallback options.
  it('does not emit the fallback debug log on the primary lane', async () => {
    process.env.TEXTUI_LOG_LEVEL = 'debug';
    const logs = [];

    const exporter = new HtmlExporter();
    const originalDebug = exporter.logger.debug.bind(exporter.logger);
    exporter.logger.debug = (message, ...args) => {
      logs.push(message);
      originalDebug(message, ...args);
    };

    await exporter.export(dsl, { format: 'html' });

    assert.ok(
      logs.every(message => !message.includes('using fallback HTML render path')),
      'primary lane should stay quiet even when debug logging is enabled'
    );
  });
});
