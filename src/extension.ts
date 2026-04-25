import * as vscode from 'vscode';
import { bootstrapVscode, teardownVscode } from './bootstrap/vscode-bootstrap';

export async function activate(context: vscode.ExtensionContext) {
  await bootstrapVscode(context);
}

export function deactivate() {
  teardownVscode();
}
