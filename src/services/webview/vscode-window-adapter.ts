import * as vscode from 'vscode';

export class VsCodeWindowAdapter {
  showWarningMessage(message: string): Thenable<string | undefined> {
    return this.invoke('showWarningMessage', message);
  }

  showInformationMessage(message: string): Thenable<string | undefined> {
    return this.invoke('showInformationMessage', message);
  }

  showErrorMessage(message: string): Thenable<string | undefined> {
    return this.invoke('showErrorMessage', message);
  }

  private invoke(
    method: 'showWarningMessage' | 'showInformationMessage' | 'showErrorMessage',
    message: string
  ): Thenable<string | undefined> {
    const globalVscodeWindow = (globalThis as { vscode?: { window?: Record<string, unknown> } }).vscode?.window;
    const globalMethod = globalVscodeWindow && typeof globalVscodeWindow[method] === 'function'
      ? globalVscodeWindow[method]
      : undefined;
    const vscodeWindowMethod = (vscode.window as Record<string, unknown>)[method];
    const candidate = globalMethod ?? (typeof vscodeWindowMethod === 'function' ? vscodeWindowMethod : undefined);

    if (typeof candidate !== 'function') {
      return Promise.resolve(undefined);
    }

    return (candidate as (value: string) => Thenable<string | undefined>)(message);
  }
}
