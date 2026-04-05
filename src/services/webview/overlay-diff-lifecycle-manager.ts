import * as vscode from 'vscode';
import { getWebviewContent } from '../../utils/webview-utils';

/**
 * Overlay Diff WebView パネルのライフサイクル管理。
 *
 * 既存の `WebViewLifecycleManager`（通常プレビュー用）とは独立した
 * パネルを保持し、互いに干渉しない。
 */
export class OverlayDiffLifecycleManager {
  private currentPanel: vscode.WebviewPanel | undefined = undefined;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Overlay Diff パネルを作成して返す。
   * すでにパネルが存在する場合は既存パネルを前面に表示して返す。
   */
  async getOrCreatePanel(): Promise<vscode.WebviewPanel> {
    if (this.currentPanel) {
      this.currentPanel.reveal(vscode.ViewColumn.Two);
      return this.currentPanel;
    }

    this.currentPanel = vscode.window.createWebviewPanel(
      'textuiOverlayDiff',
      'TextUI: Overlay Diff',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri]
      }
    );

    this.currentPanel.webview.html = getWebviewContent(this.context, this.currentPanel);

    this.currentPanel.onDidDispose(
      () => {
        this.currentPanel = undefined;
      },
      null,
      this.context.subscriptions
    );

    return this.currentPanel;
  }

  getPanel(): vscode.WebviewPanel | undefined {
    return this.currentPanel;
  }

  dispose(): void {
    if (this.currentPanel) {
      this.currentPanel.dispose();
    }
  }
}
