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

  it('emits a debug log only for the internal fallback lane when debug logging is enabled', async () => {
    process.env.TEXTUI_LOG_LEVEL = 'debug';
    const logs = [];
    process.stdout.write = (chunk, encoding, callback) => {
      logs.push(String(chunk));
      if (typeof callback === 'function') {
        callback();
      }
      return true;
    };

    await new HtmlExporter().export(dsl, withExplicitFallbackHtmlExport({ format: 'html' }));

    assert.ok(
      logs.some(message => message.includes('[TextUI][HtmlExporter] using fallback HTML render path (useReactRender=false)')),
      'fallback lane should be observable through a dedicated debug log'
    );
  });

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

  it('does not emit the fallback debug log on the primary lane', async () => {
    process.env.TEXTUI_LOG_LEVEL = 'debug';
    const logs = [];
    process.stdout.write = (chunk, encoding, callback) => {
      logs.push(String(chunk));
      if (typeof callback === 'function') {
        callback();
      }
      return true;
    };

    await new HtmlExporter().export(dsl, { format: 'html' });

    assert.ok(
      logs.every(message => !message.includes('using fallback HTML render path')),
      'primary lane should stay quiet even when debug logging is enabled'
    );
  });
});
