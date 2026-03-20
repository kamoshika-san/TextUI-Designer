const assert = require('assert');
const {
  normalizeBrowserBasename,
  isHeadlessShellBinary,
  resolveHeadlessFlagAttempts,
  formatHeadlessAttemptLabel,
  buildRunBrowserCaptureArgs
} = require('../../out/utils/preview-capture/browser-capture-args.js');

describe('browser-capture-args', () => {
  const sampleParams = {
    width: 800,
    height: 600,
    scale: 1,
    waitMs: 500,
    outputPath: '/tmp/out.png',
    targetUrl: 'file:///tmp/preview.html',
    allowNoSandbox: false
  };

  it('normalizeBrowserBasename strips .exe and lowercases', () => {
    assert.strictEqual(normalizeBrowserBasename('C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe'), 'chrome');
    assert.strictEqual(normalizeBrowserBasename('/opt/google/chrome/chrome-headless-shell'), 'chrome-headless-shell');
  });

  it('isHeadlessShellBinary is true for chrome-headless-shell and headless-shell', () => {
    assert.strictEqual(isHeadlessShellBinary('/foo/chrome-headless-shell'), true);
    assert.strictEqual(isHeadlessShellBinary('C:\\\\chrome-headless-shell.exe'), true);
    assert.strictEqual(isHeadlessShellBinary('/usr/bin/chromium-headless-shell'), true);
    assert.strictEqual(isHeadlessShellBinary('/usr/bin/google-chrome'), false);
    assert.strictEqual(isHeadlessShellBinary('/usr/bin/msedge'), false);
  });

  it('resolveHeadlessFlagAttempts: headless-shell は 1 回のみかつ null（--headless なし）', () => {
    assert.deepStrictEqual(resolveHeadlessFlagAttempts('/opt/chrome-headless-shell'), [null]);
    assert.deepStrictEqual(resolveHeadlessFlagAttempts('/opt/chromium-headless-shell'), [null]);
  });

  it('resolveHeadlessFlagAttempts: 通常ブラウザは --headless=new / --headless の 2 試行', () => {
    assert.deepStrictEqual(resolveHeadlessFlagAttempts('/usr/bin/google-chrome'), ['--headless=new', '--headless']);
    assert.deepStrictEqual(resolveHeadlessFlagAttempts('C:\\\\msedge.exe'), ['--headless=new', '--headless']);
  });

  it('formatHeadlessAttemptLabel', () => {
    assert.ok(formatHeadlessAttemptLabel(null).includes('headless-shell'));
    assert.strictEqual(formatHeadlessAttemptLabel('--headless=new'), '--headless=new');
  });

  it('buildRunBrowserCaptureArgs: headless ありで先頭が --headless=new（win32）', () => {
    const args = buildRunBrowserCaptureArgs(sampleParams, '--headless=new', 'win32');
    assert.strictEqual(args[0], '--headless=new');
    assert.strictEqual(args[1], '--disable-gpu');
    assert.ok(args.includes('--screenshot=/tmp/out.png'));
    assert.strictEqual(args[args.length - 1], sampleParams.targetUrl);
  });

  it('buildRunBrowserCaptureArgs: headless なし（null）では先頭が --disable-gpu（win32）', () => {
    const args = buildRunBrowserCaptureArgs(sampleParams, null, 'win32');
    assert.strictEqual(args[0], '--disable-gpu');
    assert.ok(!args.includes('--headless=new'));
    assert.ok(!args.includes('--headless'));
  });

  it('buildRunBrowserCaptureArgs: linux で dev-shm と no-sandbox の挿入順', () => {
    const withSandbox = buildRunBrowserCaptureArgs({ ...sampleParams, allowNoSandbox: true }, '--headless=new', 'linux');
    assert.strictEqual(withSandbox[0], '--headless=new');
    assert.strictEqual(withSandbox[1], '--no-sandbox');
    assert.strictEqual(withSandbox[2], '--disable-dev-shm-usage');
    assert.strictEqual(withSandbox[3], '--disable-gpu');

    const noHeadless = buildRunBrowserCaptureArgs({ ...sampleParams, allowNoSandbox: true }, null, 'linux');
    assert.strictEqual(noHeadless[0], '--disable-gpu');
    assert.strictEqual(noHeadless[1], '--no-sandbox');
    assert.strictEqual(noHeadless[2], '--disable-dev-shm-usage');
    assert.strictEqual(noHeadless[3], '--hide-scrollbars');
  });
});
