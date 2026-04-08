const assert = require('assert');
const path = require('path');
const vscode = require('vscode');

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
    await new Promise(resolve => setTimeout(resolve, 1500));

    assert.strictEqual(vscode.window.activeTextEditor?.document.uri.fsPath, samplePath);
  });
});
