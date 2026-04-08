const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');

describe('browser-resolution', () => {
  const modulePath = '../../out/utils/preview-capture/browser-resolution.js';
  let originalSpawnSync;

  beforeEach(() => {
    originalSpawnSync = childProcess.spawnSync;
  });

  afterEach(() => {
    childProcess.spawnSync = originalSpawnSync;
    delete process.env.TEXTUI_CAPTURE_EXTRA_TRUSTED_PATHS;
    delete process.env.TEXTUI_CAPTURE_SKIP_EXECUTABLE_CHECK;
    delete process.env.TEXTUI_CAPTURE_BROWSER_PATH;
    delete require.cache[require.resolve(modulePath)];
  });

  it('prefers an explicit trusted override before system browser discovery', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-browser-resolution-'));
    const browserPath = path.join(tmpDir, process.platform === 'win32' ? 'google-chrome.cmd' : 'google-chrome');
    fs.writeFileSync(browserPath, '', 'utf8');

    process.env.TEXTUI_CAPTURE_EXTRA_TRUSTED_PATHS = browserPath;
    process.env.TEXTUI_CAPTURE_SKIP_EXECUTABLE_CHECK = '1';

    childProcess.spawnSync = () => {
      throw new Error('system browser discovery should not run for an explicit trusted override');
    };

    const { resolveBrowserPath } = require(modulePath);
    const resolved = resolveBrowserPath(browserPath);

    assert.strictEqual(resolved, fs.realpathSync(browserPath));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
