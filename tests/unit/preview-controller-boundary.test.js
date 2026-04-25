const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('preview controller boundary guard (Sprint 3)', () => {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const source = fs.readFileSync(path.join(repoRoot, 'src/services/preview/preview-controller.ts'), 'utf8');

  it('does not import vscode directly', () => {
    assert.ok(!/from ['"]vscode['"]/.test(source), 'preview-controller must not import vscode');
  });

  it('depends on boundary ports, not concrete webview manager classes', () => {
    assert.ok(source.includes("from './preview-ports'"), 'preview-controller should depend on preview-ports');
    assert.ok(
      source.includes("from './preview-theme-file-port'"),
      'preview-controller should depend on preview-theme-file-port'
    );
    assert.ok(!source.includes("webview-message-handler"), 'preview-controller should not import webview-message-handler directly');
    assert.ok(!source.includes("webview-update-manager"), 'preview-controller should not import webview-update-manager directly');
    assert.ok(!source.includes("from 'fs'"), 'preview-controller should not import fs directly');
    assert.ok(!source.includes("from 'path'"), 'preview-controller should not import path directly');
  });
});
