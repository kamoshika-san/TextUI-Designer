const assert = require('assert');
const path = require('path');

describe('navigation-jump-command', () => {
  let resolveNavigationJumpTargetFile;

  before(() => {
    ({ resolveNavigationJumpTargetFile } = require('../../out/services/commands/navigation-jump-command'));
  });

  it('resolves a relative page path from the current flow document', () => {
    const flowFile = path.win32.join('C:\\workspace', 'app.tui.flow.yml');
    const resolved = resolveNavigationJumpTargetFile({
      requestedTargetFilePath: './screens/home.tui.yml',
      activeEditorFile: flowFile,
      lastPreviewFile: flowFile
    });

    assert.strictEqual(resolved, path.win32.join('C:\\workspace', 'screens', 'home.tui.yml'));
  });

  it('falls back to the last preview file when no explicit target is provided', () => {
    const flowFile = path.win32.join('C:\\workspace', 'app.tui.flow.yml');
    const resolved = resolveNavigationJumpTargetFile({
      lastPreviewFile: flowFile
    });

    assert.strictEqual(resolved, flowFile);
  });
});
