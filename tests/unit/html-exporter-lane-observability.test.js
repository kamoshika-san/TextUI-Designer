const assert = require('assert');
const { HtmlExporter } = require('../../out/exporters/html-exporter');

describe('HtmlExporter lane observability', () => {
  const dsl = {
    page: {
      components: [{ Text: { value: 'lane check' } }]
    }
  };

  let originalLevel;
  let originalWrite;

  beforeEach(() => {
    originalLevel = process.env.TEXTUI_LOG_LEVEL;
    originalWrite = process.stdout.write;
  });

  afterEach(() => {
    if (originalLevel === undefined) {
      delete process.env.TEXTUI_LOG_LEVEL;
    } else {
      process.env.TEXTUI_LOG_LEVEL = originalLevel;
    }
    process.stdout.write = originalWrite;
  });

  it('emits a debug log only for the fallback lane when debug logging is enabled', async () => {
    process.env.TEXTUI_LOG_LEVEL = 'debug';
    const logs = [];
    process.stdout.write = (chunk, encoding, callback) => {
      logs.push(String(chunk));
      if (typeof callback === 'function') {
        callback();
      }
      return true;
    };

    await new HtmlExporter().export(dsl, { format: 'html', useReactRender: false });

    assert.ok(
      logs.some(message => message.includes('[TextUI][HtmlExporter] using fallback HTML render path (useReactRender=false)')),
      'fallback lane should be observable through a dedicated debug log'
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
