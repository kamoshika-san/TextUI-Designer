import * as vscode from 'vscode';
import { getWebviewContent } from '../../utils/webview-utils';
import { TextUIMemoryTracker } from '../../utils/textui-memory-tracker';

/**
 * WebViewパネルのライフサイクル管理を担当
 * パネルの作成・破棄・状態管理を一元化
 */
export class WebViewLifecycleManager {
  private currentPanel: vscode.WebviewPanel | undefined = undefined;
  private context: vscode.ExtensionContext;
  private memoryTracker: TextUIMemoryTracker;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.memoryTracker = TextUIMemoryTracker.getInstance();
  }

  /**
   * プレビューパネルを作成
   */
  async createPreviewPanel(): Promise<vscode.WebviewPanel> {
    const columnToShowIn = vscode.ViewColumn.Two;

    this.currentPanel = vscode.window.createWebviewPanel(
      'textuiPreview',
      'TextUI Preview',
      columnToShowIn,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        enableFindWidget: true,
        localResourceRoots: [this.context.extensionUri],
        ...(process.env.NODE_ENV === 'development' && {
          enableCommandUris: true,
        }),
      }
    );

    // WebViewのHTMLをセット
    this.currentPanel.webview.html = getWebviewContent(this.context, this.currentPanel);

    // WebViewパネルのメモリ使用量を追跡開始
    const webviewSize = this.estimateWebviewSize(this.currentPanel.webview.html);
    this.memoryTracker.trackWebviewObject(this.currentPanel, webviewSize, {
      title: 'TextUI Preview',
      column: columnToShowIn
    });

    // パネルが閉じられたときの処理
    this.currentPanel.onDidDispose(
      () => {
        this.currentPanel = undefined;
      },
      null,
      this.context.subscriptions
    );

    return this.currentPanel;
  }

  /**
   * 既存のパネルを表示
   */
  revealPanel(): void {
    if (this.currentPanel) {
      this.currentPanel.reveal(vscode.ViewColumn.Two);
    }
  }

  /**
   * プレビューパネルを閉じる
   */
  closePanel(): void {
    if (this.currentPanel) {
      console.log('[WebViewLifecycleManager] プレビューを閉じます');
      this.currentPanel.dispose();
      this.currentPanel = undefined;
    }
  }

  /**
   * パネルが存在するかチェック
   */
  hasPanel(): boolean {
    return this.currentPanel !== undefined;
  }

  /**
   * パネルを取得
   */
  getPanel(): vscode.WebviewPanel | undefined {
    return this.currentPanel;
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    if (this.currentPanel) {
      this.currentPanel.dispose();
    }
  }

  /**
   * WebViewのメモリサイズを推定
   */
  private estimateWebviewSize(html: string): number {
    // HTMLサイズ（文字列の長さ × 2バイト、UTF-16想定）
    const htmlSize = html.length * 2;
    
    // WebViewパネル自体のオーバーヘッド（推定値）
    const webviewOverhead = 50000; // 約50KB
    
    return htmlSize + webviewOverhead;
  }
} 