import * as vscode from 'vscode';
import * as YAML from 'yaml';
import { validateNavigationFlow } from '../../shared/navigation-flow-validator';
import { resolveRangeFromPath } from './range-resolver';

export class FlowDiagnosticsManager {
  createDiagnostics(document: vscode.TextDocument, text: string): vscode.Diagnostic[] {
    let parsed: unknown;

    try {
      parsed = YAML.parse(text);
    } catch {
      return [];
    }

    return validateNavigationFlow(parsed, { sourcePath: document.fileName }).map(issue => {
      const diagnostic = new vscode.Diagnostic(
        resolveRangeFromPath(issue.path, text, document),
        issue.code ? `[${issue.code}] ${issue.message}` : issue.message,
        issue.level === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning
      );

      if (issue.code) {
        diagnostic.code = issue.code;
      }

      return diagnostic;
    });
  }
}
