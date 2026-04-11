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
  let DiagnosticSeverity;

  before(() => {
    ({ FlowDiagnosticsManager } = require('../../out/services/diagnostics/flow-diagnostics-manager'));
    ({ DiagnosticSeverity } = require('../mocks/vscode-mock'));
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
      assert.ok(diagnostics.every(diag => diag.source === 'textui.navigation-flow'));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('maps loop policy warnings and terminal screen requirements into VS Code diagnostics', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-flow-diag-v2-'));

    try {
      fs.mkdirSync(path.join(tempDir, 'screens'));
      fs.writeFileSync(path.join(tempDir, 'screens', 'start.tui.yml'), 'page:\n  id: start\n  title: Start\n  layout: vertical\n  components: []\n');
      fs.writeFileSync(path.join(tempDir, 'screens', 'review.tui.yml'), 'page:\n  id: review\n  title: Review\n  layout: vertical\n  components: []\n');

      const loopWarnText = [
        'flow:',
        '  id: policy-warn',
        '  version: "2"',
        '  title: Policy Warn',
        '  entry: start',
        '  policy:',
        '    loops: warn',
        '  screens:',
        '    - id: start',
        '      page: ./screens/start.tui.yml',
        '    - id: review',
        '      page: ./screens/review.tui.yml',
        '      kind: review',
        '  transitions:',
        '    - id: t1',
        '      from: start',
        '      to: review',
        '      trigger: next',
        '    - id: t2',
        '      from: review',
        '      to: start',
        '      trigger: back',
        '      kind: loop'
      ].join('\n');

      const terminalRequiredText = [
        'flow:',
        '  id: terminal-required',
        '  version: "2"',
        '  title: Terminal Required',
        '  entry: start',
        '  policy:',
        '    terminalScreensRequired: true',
        '  screens:',
        '    - id: start',
        '      page: ./screens/start.tui.yml',
        '    - id: review',
        '      page: ./screens/review.tui.yml',
        '      kind: review',
        '  transitions:',
        '    - from: start',
        '      to: review',
        '      trigger: next'
      ].join('\n');

      const loopDiagnostics = new FlowDiagnosticsManager().createDiagnostics(
        createDocument(path.join(tempDir, 'warn.tui.flow.yml'), loopWarnText),
        loopWarnText
      );
      const terminalDiagnostics = new FlowDiagnosticsManager().createDiagnostics(
        createDocument(path.join(tempDir, 'terminal-required.tui.flow.yml'), terminalRequiredText),
        terminalRequiredText
      );

      const cycleWarning = loopDiagnostics.find(diag => String(diag.code) === 'NAV_004');
      assert.ok(cycleWarning);
      assert.strictEqual(cycleWarning.severity, DiagnosticSeverity.Warning);

      const terminalError = terminalDiagnostics.find(diag => String(diag.code) === 'NAV_008');
      assert.ok(terminalError);
      assert.strictEqual(terminalError.severity, DiagnosticSeverity.Error);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
