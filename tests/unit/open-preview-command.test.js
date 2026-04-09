const assert = require('assert');
const path = require('path');

describe('executeOpenPreviewCommand', () => {
  let executeOpenPreviewCommand;
  let ConfigManager;
  let vscode;
  let originalIsSupportedFile;
  let originalActiveTextEditor;

  before(() => {
    require('ts-node/register/transpile-only');
    ({ executeOpenPreviewCommand } = require(path.resolve(__dirname, '../../src/services/commands/open-preview-command.ts')));
    ({ ConfigManager } = require(path.resolve(__dirname, '../../src/utils/config-manager.ts')));
    vscode = require('vscode');
  });

  beforeEach(() => {
    originalIsSupportedFile = ConfigManager.isSupportedFile;
    originalActiveTextEditor = vscode.window.activeTextEditor;
  });

  afterEach(() => {
    ConfigManager.isSupportedFile = originalIsSupportedFile;
    vscode.window.activeTextEditor = originalActiveTextEditor;
  });

  it('sets the active flow file before opening preview', async () => {
    const calls = [];
    const webViewManager = {
      setLastTuiFile(filePath) {
        calls.push(['setLastTuiFile', filePath]);
      },
      openPreview: async () => {
        calls.push(['openPreview']);
      }
    };

    ConfigManager.isSupportedFile = (fileName) => fileName.endsWith('.tui.flow.yml');
    vscode.window.activeTextEditor = {
      document: {
        fileName: 'C:/workspace/app.tui.flow.yml'
      }
    };

    await executeOpenPreviewCommand(webViewManager, {
      debug() {},
      error() {}
    });

    assert.deepStrictEqual(calls, [
      ['setLastTuiFile', 'C:/workspace/app.tui.flow.yml'],
      ['openPreview']
    ]);
  });

  it('opens preview without updating the target when the active file is unsupported', async () => {
    const calls = [];
    const webViewManager = {
      setLastTuiFile(filePath) {
        calls.push(['setLastTuiFile', filePath]);
      },
      openPreview: async () => {
        calls.push(['openPreview']);
      }
    };

    ConfigManager.isSupportedFile = () => false;
    vscode.window.activeTextEditor = {
      document: {
        fileName: 'C:/workspace/notes.txt'
      }
    };

    await executeOpenPreviewCommand(webViewManager, {
      debug() {},
      error() {}
    });

    assert.deepStrictEqual(calls, [
      ['openPreview']
    ]);
  });
});
