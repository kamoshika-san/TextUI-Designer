const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { HtmlExporter } = require('../../out/exporters/html-exporter');
const { getProvider } = require('../../out/cli/provider-registry');
const { prepareCaptureArtifacts } = require('../../out/utils/preview-capture/html-preparation');

describe('HtmlExporter route viability (T-20260322-352)', () => {
  const dsl = {
    page: {
      components: [{ Text: { value: 'route viability' } }]
    }
  };

  let originalExport;
  let originalExtraTrustedPaths;
  let originalBrowserPath;
  let originalSkipExecutableCheck;

  beforeEach(() => {
    originalExport = HtmlExporter.prototype.export;
    originalExtraTrustedPaths = process.env.TEXTUI_CAPTURE_EXTRA_TRUSTED_PATHS;
    originalBrowserPath = process.env.TEXTUI_CAPTURE_BROWSER_PATH;
    originalSkipExecutableCheck = process.env.TEXTUI_CAPTURE_SKIP_EXECUTABLE_CHECK;
  });

  afterEach(() => {
    HtmlExporter.prototype.export = originalExport;

    if (originalExtraTrustedPaths === undefined) {
      delete process.env.TEXTUI_CAPTURE_EXTRA_TRUSTED_PATHS;
    } else {
      process.env.TEXTUI_CAPTURE_EXTRA_TRUSTED_PATHS = originalExtraTrustedPaths;
    }

    if (originalBrowserPath === undefined) {
      delete process.env.TEXTUI_CAPTURE_BROWSER_PATH;
    } else {
      process.env.TEXTUI_CAPTURE_BROWSER_PATH = originalBrowserPath;
    }

    if (originalSkipExecutableCheck === undefined) {
      delete process.env.TEXTUI_CAPTURE_SKIP_EXECUTABLE_CHECK;
    } else {
      process.env.TEXTUI_CAPTURE_SKIP_EXECUTABLE_CHECK = originalSkipExecutableCheck;
    }
  });

  it('built-in html provider is already viable on the primary lane', async () => {
    const calls = [];
    HtmlExporter.prototype.export = async function (_dsl, options) {
      calls.push(options);
      return '<html><body>provider</body></html>';
    };

    const provider = getProvider('html');
    assert.ok(provider, 'html provider should exist');

    const html = await provider.render(dsl);

    assert.ok(html.includes('provider'));
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].format, 'html');
    assert.strictEqual(calls[0].useReactRender, true);
  });

  it('preview capture preparation defaults to the primary lane and can be validated without switching routes', async () => {
    const calls = [];
    HtmlExporter.prototype.export = async function (_dsl, options) {
      calls.push(options);
      return '<html><body>preview</body></html>';
    };

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-route-viability-'));
    const fakeBrowserPath = path.join(tempRoot, 'chrome.exe');
    const outputPath = path.join(tempRoot, 'capture.png');
    fs.writeFileSync(fakeBrowserPath, '');

    process.env.TEXTUI_CAPTURE_EXTRA_TRUSTED_PATHS = fakeBrowserPath;
    process.env.TEXTUI_CAPTURE_SKIP_EXECUTABLE_CHECK = '1';

    let result;
    try {
      result = await prepareCaptureArtifacts(dsl, {
        outputPath,
        browserPath: fakeBrowserPath
      });
    } finally {
      if (result?.tempDir) {
        fs.rmSync(result.tempDir, { recursive: true, force: true });
      }
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }

    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].format, 'html');
    assert.strictEqual(calls[0].useReactRender, true);
  });

  it('capture command uses the primary HtmlExporter lane (T-010)', () => {
    const repoRoot = path.resolve(__dirname, '../..');
    const captureCommandPath = path.join(repoRoot, 'src/cli/commands/capture-command.ts');
    const source = fs.readFileSync(captureCommandPath, 'utf8');

    assert.doesNotMatch(
      source,
      /withExplicitFallbackHtmlExport\s*\(/,
      'CLI capture should not force the compatibility fallback lane; preview-capture defaults to Primary (useReactRender ?? true)'
    );
    assert.doesNotMatch(
      source,
      /useReactRender\s*:\s*false/,
      'capture command should not carry a raw fallback literal'
    );
  });
});

/**
 * HtmlExporter fallback entry guard (T-20260322-354, merged from html-exporter-fallback-entry-guard.test.js in T-016)
 *
 * Why this lives next to route-viability tests: T-010 requires **zero production callers** forcing
 * `useReactRender: false` except the typed helper in `html-export-lane-options.ts`. This guard is
 * not a runtime fallback execution test — it is a **source-level contract** that must hold for
 * Primary-only routing to remain trustworthy. Keeping it here avoids an extra `*fallback*` file
 * whose name implied HTML execution when it only scans `src/**`.
 */
describe('HtmlExporter fallback entry guard (T-20260322-354)', () => {
  const repoRoot = path.resolve(__dirname, '../..');
  const srcDir = path.join(repoRoot, 'src');
  const fallbackLiteral = /useReactRender\s*:\s*false\b/;
  const allowedLiteralFiles = new Set(['src/exporters/html-export-lane-options.ts']);

  function walkSourceLikeFiles(dir, out = []) {
    if (!fs.existsSync(dir)) {
      return out;
    }
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walkSourceLikeFiles(full, out);
        continue;
      }
      if (/\.(ts|tsx|js)$/.test(ent.name)) {
        out.push(full);
      }
    }
    return out;
  }

  function toPosixRelative(filePath) {
    return path.relative(repoRoot, filePath).split(path.sep).join('/');
  }

  function stripComments(source) {
    return source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
  }

  it('src では useReactRender: false の直書きを helper 定義だけに制限する', () => {
    const violations = [];

    for (const filePath of walkSourceLikeFiles(srcDir)) {
      const rel = toPosixRelative(filePath);
      const text = stripComments(fs.readFileSync(filePath, 'utf8'));
      if (fallbackLiteral.test(text) && !allowedLiteralFiles.has(rel)) {
        violations.push(`${rel}: useReactRender: false must go through html-export-lane-options helper`);
      }
    }

    assert.deepStrictEqual(
      violations,
      [],
      `Unexpected fallback entrypoint detected in src/**\n${violations.join('\n')}`
    );
  });
});

const { withExplicitFallbackHtmlExport } = require('../../out/exporters/html-export-lane-options');

describe('HtmlExporter fallback runtime hard gate (T-019)', () => {
  const dsl = {
    page: {
      components: [{ Text: { value: 'hard gate' } }]
    }
  };

  it('throws when TEXTUI_ENABLE_FALLBACK is not 1 even with the internal compatibility flag', async () => {
    const exporter = new HtmlExporter();
    const prev = process.env.TEXTUI_ENABLE_FALLBACK;
    delete process.env.TEXTUI_ENABLE_FALLBACK;
    try {
      await assert.rejects(
        async () => exporter.export(dsl, withExplicitFallbackHtmlExport({ format: 'html' })),
        (err) =>
          err instanceof Error &&
          err.message.includes('[HtmlExporter:FALLBACK_BLOCKED]') &&
          err.message.includes('TEXTUI_ENABLE_FALLBACK')
      );
    } finally {
      if (prev === undefined) {
        process.env.TEXTUI_ENABLE_FALLBACK = '1';
      } else {
        process.env.TEXTUI_ENABLE_FALLBACK = prev;
      }
    }
  });
});
