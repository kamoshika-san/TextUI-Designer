/**
 * HtmlExporter lane observability (debug / deprecation signals).
 *
 * T-016: These tests intentionally execute the **fallback HTML lane** (or raw `useReactRender:false`)
 * to assert **logging and deprecation warnings** — behavior that does not appear when only Primary
 * export runs. They complement `html-exporter-fallback-style-lane.test.js` (markup/CSS) and cannot
 * be merged there without mixing unrelated assertions.
 */
const assert = require('assert');
const { HtmlExporter } = require('../../out/exporters/html-exporter');
const { withExplicitFallbackHtmlExport } = require('../../out/exporters/html-export-lane-options');

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

    await exporter.export(dsl, withExplicitFallbackHtmlExport({ format: 'html' }));

    assert.ok(
      logs.some(message => message.includes('using fallback HTML render path (useReactRender=false)')),
      'fallback lane should be observable through a dedicated debug log'
    );
  });

  // Executes raw `useReactRender:false` to ensure deprecation warning path stays wired (tests are sole intentional callers).
  it('warns when a public caller requests the fallback lane directly', async () => {
    const warnings = [];
    const exporter = new HtmlExporter();
    const originalLoggerWarn = exporter.logger.warn.bind(exporter.logger);
    exporter.logger.warn = (message, ...args) => {
      warnings.push([message, ...args].map(String).join(' '));
    };

    await exporter.export(dsl, { format: 'html', useReactRender: false });
    exporter.logger.warn = originalLoggerWarn;

    assert.ok(
      warnings.some(message => message.includes('useReactRender=false is deprecated for public export callers')),
      'raw fallback requests should emit a deprecation warning'
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
