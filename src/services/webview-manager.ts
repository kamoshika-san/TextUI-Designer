import * as vscode from 'vscode';
import * as YAML from 'yaml';
import { getWebviewContent } from '../utils/webview-utils';
import { PerformanceMonitor } from '../utils/performance-monitor';

/**
 * WebView管理サービス
 * プレビュー画面のWebView管理を担当
 */
export class WebViewManager {
  private currentPanel: vscode.WebviewPanel | undefined = undefined;
  private context: vscode.ExtensionContext;
  private lastTuiFile: string | undefined = undefined;
  private updateTimeout: NodeJS.Timeout | undefined = undefined;
  private lastYamlContent: string = '';
  private lastParsedData: any = null;
  private isUpdating: boolean = false;
  private performanceMonitor: PerformanceMonitor;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }

  /**
   * プレビューを開く
   */
  async openPreview(): Promise<void> {
    const columnToShowIn = vscode.ViewColumn.Two;

    if (this.currentPanel) {
      this.currentPanel.reveal(columnToShowIn);
    } else {
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

      // 初回データ送信
      await this.sendYamlToWebview();

      // WebViewからのメッセージを処理
      this.currentPanel.webview.onDidReceiveMessage(
        async (message) => {
          if (message.type === 'export') {
            console.log('[WebViewManager] エクスポートメッセージを受信');
            // 最後に開いていたtui.ymlファイルを使用してエクスポート
            if (this.lastTuiFile) {
              console.log(`[WebViewManager] エクスポート用ファイル: ${this.lastTuiFile}`);
              await vscode.commands.executeCommand('textui-designer.export', this.lastTuiFile);
            } else {
              console.log('[WebViewManager] エクスポート用ファイルが見つかりません');
              vscode.window.showWarningMessage('エクスポートするファイルが見つかりません。先に.tui.ymlファイルを開いてください。');
            }
          }
        },
        undefined,
        this.context.subscriptions
      );

      // パネルが閉じられたときの処理
      this.currentPanel.onDidDispose(
        () => {
          this.currentPanel = undefined;
          this.clearCache();
        },
        null,
        this.context.subscriptions
      );
    }
  }

  /**
   * プレビューを更新（デバウンス付き）
   */
  async updatePreview(): Promise<void> {
    if (this.currentPanel) {
      // 既存のタイマーをクリア
      if (this.updateTimeout) {
        clearTimeout(this.updateTimeout);
      }

      // デバウンス（300ms）
      this.updateTimeout = setTimeout(async () => {
        await this.sendYamlToWebview();
      }, 300);
    } else {
      // プレビューが開かれていない場合は自動的に開く
      await this.openPreview();
    }
  }

  /**
   * 最後に開いていたtui.ymlファイルのパスを設定
   */
  setLastTuiFile(filePath: string): void {
    this.lastTuiFile = filePath;
  }

  /**
   * 最後に開いていたtui.ymlファイルのパスを取得
   */
  getLastTuiFile(): string | undefined {
    return this.lastTuiFile;
  }

  /**
   * WebViewにYAMLデータを送信（キャッシュ付き）
   */
  private async sendYamlToWebview(): Promise<void> {
    return this.performanceMonitor.measureRenderTime(async () => {
      if (!this.currentPanel || this.isUpdating) {
        console.log('[WebViewManager] パネルが存在しないか、更新中です');
        return;
      }

      this.isUpdating = true;

      try {
        const activeEditor = vscode.window.activeTextEditor;
        let yamlContent = '';
        let fileName = '';

        console.log(`[WebViewManager] アクティブエディタ: ${activeEditor?.document.fileName}`);
        console.log(`[WebViewManager] 最後のファイル: ${this.lastTuiFile}`);

        if (activeEditor && activeEditor.document.fileName.endsWith('.tui.yml')) {
          yamlContent = activeEditor.document.getText();
          fileName = activeEditor.document.fileName;
          this.setLastTuiFile(fileName);
          console.log(`[WebViewManager] アクティブエディタからYAMLを取得: ${fileName}`);
        } else if (this.lastTuiFile) {
          // アクティブなエディタがない場合は最後に開いていたファイルを使用
          const document = await vscode.workspace.openTextDocument(this.lastTuiFile);
          yamlContent = document.getText();
          fileName = this.lastTuiFile;
          console.log(`[WebViewManager] 最後のファイルからYAMLを取得: ${fileName}`);
        } else {
          // デフォルトのサンプルデータ
          yamlContent = `page:
  id: sample
  title: "サンプル"
  layout: vertical
  components:
    - Text:
        variant: h1
        value: "TextUI Designer"
    - Text:
        variant: p
        value: "プレビューが表示されています"`;
          fileName = 'sample.tui.yml';
          console.log(`[WebViewManager] サンプルデータを使用`);
        }

        // キャッシュチェック
        if (yamlContent === this.lastYamlContent && this.lastParsedData) {
          console.log('[WebViewManager] キャッシュされたデータを使用');
          this.performanceMonitor.recordCacheHit(true);
          this.sendMessageToWebView(this.lastParsedData, fileName);
          return;
        }

        this.performanceMonitor.recordCacheHit(false);

        const yaml = YAML.parse(yamlContent);
        console.log(`[WebViewManager] YAML解析成功、WebViewに送信: ${fileName}`);
        
        // キャッシュを更新
        this.lastYamlContent = yamlContent;
        this.lastParsedData = yaml;
        
        this.sendMessageToWebView(yaml, fileName);
        console.log(`[WebViewManager] メッセージ送信完了`);
      } catch (error) {
        console.error('[WebViewManager] YAMLデータの送信に失敗しました:', error);
        this.currentPanel.webview.postMessage({
          type: 'error',
          message: `YAMLの解析に失敗しました: ${error}`
        });
      } finally {
        this.isUpdating = false;
      }
    });
  }

  /**
   * WebViewにメッセージを送信
   */
  private sendMessageToWebView(data: any, fileName: string): void {
    if (!this.currentPanel) return;

    const message = {
      type: 'update',
      data: data,
      fileName: fileName
    };
    
    console.log(`[WebViewManager] 送信メッセージ:`, message);
    this.currentPanel.webview.postMessage(message);
  }

  /**
   * キャッシュをクリア
   */
  private clearCache(): void {
    this.lastYamlContent = '';
    this.lastParsedData = null;
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = undefined;
    }
  }

  /**
   * 開発者ツールを開く
   */
  openDevTools(): void {
    if (this.currentPanel) {
      this.currentPanel.webview.postMessage({ type: 'openDevTools' });
    } else {
      vscode.window.showWarningMessage('プレビューが開かれていません。先にプレビューを開いてください。');
    }
  }

  /**
   * WebViewパネルが存在するかチェック
   */
  hasPanel(): boolean {
    return this.currentPanel !== undefined;
  }

  /**
   * WebViewパネルを取得
   */
  getPanel(): vscode.WebviewPanel | undefined {
    return this.currentPanel;
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    this.clearCache();
    if (this.currentPanel) {
      this.currentPanel.dispose();
    }
  }

  /**
   * テーマ用CSS変数をWebViewへ送信
   */
  applyThemeVariables(css: string): void {
    if (!this.currentPanel) {
      return;
    }
    this.currentPanel.webview.postMessage({
      type: 'theme-variables',
      css
    });
  }

  /**
   * WebViewにテーマ変更を通知
   */
  notifyThemeChange(theme: 'light' | 'dark'): void {
    if (!this.currentPanel) {
      console.log('[WebViewManager] テーマ変更通知: パネルが存在しません');
      return;
    }

    console.log(`[WebViewManager] テーマ変更通知: ${theme}`);
    this.currentPanel.webview.postMessage({
      type: 'theme-change',
      theme: theme
    });
  }
} 