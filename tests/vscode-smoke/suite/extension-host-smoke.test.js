const assert = require('assert');
const path = require('path');
const vscode = require('vscode');

async function waitForPreviewWebviewTab(timeoutMs = 5000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const webviewTab = vscode.window.tabGroups.all
      .flatMap(group => group.tabs)
      .find(tab => {
        const input = tab.input;
        return input instanceof vscode.TabInputWebview;
      });

    if (webviewTab) {
      return webviewTab;
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return null;
}

suite('TextUI real host smoke', () => {
  test('activates and opens preview for the sample DSL in a real extension host', async () => {
    const extension = vscode.extensions.getExtension('kamoshika-san.textui-designer');
    assert.ok(extension, 'Expected TextUI Designer extension to be installed in the host');

    await extension.activate();
    assert.strictEqual(extension.isActive, true);

    const samplePath = path.resolve(__dirname, '..', '..', '..', 'sample', '01-basic', 'sample.tui.yml');
    const document = await vscode.workspace.openTextDocument(samplePath);
    await vscode.window.showTextDocument(document);

    await vscode.commands.executeCommand('textui-designer.openPreview');
    const previewTab = await waitForPreviewWebviewTab(15000);

    assert.ok(previewTab, 'Expected TextUI preview command to create a webview tab');
    assert.ok(
      typeof previewTab.label === 'string' && previewTab.label.includes('TextUI Preview'),
      `Expected preview webview label to mention TextUI Preview, got: ${previewTab.label}`
    );
  });
});
