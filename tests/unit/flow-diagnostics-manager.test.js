const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

function createDocument(fileName, text) {
  const vscode = require('vscode');

  return {
    fileName,
    uri: vscode.Uri.file(fileName),
    getText: () => text,
    positionAt(offset) {
      const head = text.slice(0, offset);
      const lines = head.split('\n');
      return new vscode.Position(lines.length - 1, lines[lines.length - 1].length);
    }
  };
}

describe('FlowDiagnosticsManager', () => {
  let FlowDiagnosticsManager;

  before(() => {
    ({ FlowDiagnosticsManager } = require('../../out/services/diagnostics/flow-diagnostics-manager'));
  });

  it('creates VS Code diagnostics for semantic flow issues', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-flow-diag-'));

    try {
      fs.mkdirSync(path.join(tempDir, 'screens'));
      fs.writeFileSync(path.join(tempDir, 'screens', 'home.tui.yml'), 'page:\n  id: home\n  title: Home\n  layout: vertical\n  components: []\n');

      const text = [
        'flow:',
        '  id: broken',
        '  title: Broken',
        '  entry: home',
        '  screens:',
        '    - id: home',
        '      page: ./screens/home.tui.yml',
        '    - id: orphan',
        '      page: ./screens/orphan.tui.yml',
        '  transitions:',
        '    - from: home',
        '      to: missing',
        '      trigger: next'
      ].join('\n');

      const document = createDocument(path.join(tempDir, 'app.tui.flow.yml'), text);
      const diagnostics = new FlowDiagnosticsManager().createDiagnostics(document, text);

      const entryDiagnostics = new FlowDiagnosticsManager().createDiagnostics(
        createDocument(
          path.join(tempDir, 'entry.tui.flow.yml'),
          [
            'flow:',
            '  id: missing-entry',
            '  title: Missing Entry',
            '  entry: unknown',
            '  screens:',
            '    - id: home',
            '      page: ./screens/home.tui.yml',
            '  transitions: []'
          ].join('\n')
        ),
        [
          'flow:',
          '  id: missing-entry',
          '  title: Missing Entry',
          '  entry: unknown',
          '  screens:',
          '    - id: home',
          '      page: ./screens/home.tui.yml',
          '  transitions: []'
        ].join('\n')
      );

      assert.ok(entryDiagnostics.some(diag => String(diag.code) === 'NAV_001'));
      assert.ok(diagnostics.some(diag => String(diag.code) === 'NAV_002'));
      assert.ok(diagnostics.some(diag => String(diag.code) === 'NAV_003'));
      assert.ok(diagnostics.some(diag => String(diag.code) === 'NAV_005'));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
