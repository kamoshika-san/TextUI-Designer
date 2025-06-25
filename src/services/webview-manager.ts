import * as vscode from 'vscode';
import * as YAML from 'yaml';
import { getWebviewContent } from '../utils/webview-utils';
import { PerformanceMonitor } from '../utils/performance-monitor';
import { ThemeManager } from './theme-manager';
import { ConfigManager } from '../utils/config-manager';

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
  private themeManager: ThemeManager | undefined;
  private updateQueue: (() => Promise<void>)[] = [];
  private isProcessingQueue: boolean = false;
  private lastUpdateTime: number = 0;
  private readonly MIN_UPDATE_INTERVAL: number;
  private readonly MAX_YAML_SIZE: number = 1024 * 1024; // 1MB制限
  private readonly MAX_QUEUE_SIZE: number = 5; // キューサイズ制限
  private parseTimeout: NodeJS.Timeout | undefined = undefined;

  constructor(context: vscode.ExtensionContext, themeManager?: ThemeManager) {
    this.context = context;
    this.themeManager = themeManager;
    this.performanceMonitor = PerformanceMonitor.getInstance();
    
    // 設定から最小更新間隔を取得
    const performanceSettings = ConfigManager.getPerformanceSettings();
    this.MIN_UPDATE_INTERVAL = performanceSettings.minUpdateInterval;
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
          } else if (message.type === 'webview-ready') {
            console.log('[WebViewManager] WebView準備完了メッセージを受信');
            console.log('[WebViewManager] 設定チェックを開始します');
            
            // 自動プレビュー設定をチェック
            const autoPreviewEnabled = ConfigManager.isAutoPreviewEnabled();
            console.log(`[WebViewManager] WebView準備完了時の設定値: autoPreview.enabled = ${autoPreviewEnabled}`);
            console.log(`[WebViewManager] 設定チェック結果: ${autoPreviewEnabled ? '有効' : '無効'}`);
            
            if (autoPreviewEnabled) {
              console.log('[WebViewManager] 設定が有効なため、YAMLデータを送信します');
              // WebViewが準備完了したら、YAMLデータとテーマ変数を送信
              await this.sendYamlToWebview();
              if (this.themeManager) {
                console.log('[WebViewManager] 初回テーマ変数を送信');
                this.applyThemeVariables(this.themeManager.generateCSSVariables());
              }
            } else {
              console.log('[WebViewManager] 自動プレビューが無効なため、初期データ送信をスキップします');
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
    // 自動プレビュー設定をチェック
    const autoPreviewEnabled = ConfigManager.isAutoPreviewEnabled();
    console.log(`[WebViewManager] updatePreview called - autoPreview.enabled = ${autoPreviewEnabled}`);
    
    if (!autoPreviewEnabled) {
      console.log('[WebViewManager] 自動プレビューが無効なため、プレビュー更新をスキップします');
      return;
    }

    if (this.currentPanel) {
      console.log('[WebViewManager] 既存のパネルを更新します');
      // 既存のタイマーをクリア
      if (this.updateTimeout) {
        clearTimeout(this.updateTimeout);
      }

      // より長いデバウンス時間（500ms）で安定性を向上
      this.updateTimeout = setTimeout(async () => {
        await this.queueUpdate(() => this.sendYamlToWebview());
      }, 500);
    } else {
      // プレビューが開かれていない場合は自動的に開く
      console.log('[WebViewManager] プレビューが開かれていないため、自動的に開きます');
      await this.openPreview();
    }
  }

  /**
   * 更新処理をキューに追加（競合状態を防ぐ）
   */
  private async queueUpdate(updateFunction: () => Promise<void>): Promise<void> {
    // 最小更新間隔をチェック
    const now = Date.now();
    if (now - this.lastUpdateTime < this.MIN_UPDATE_INTERVAL) {
      console.log('[WebViewManager] 更新間隔が短すぎるため、スキップします');
      return;
    }

    // キューサイズ制限をチェック
    if (this.updateQueue.length >= this.MAX_QUEUE_SIZE) {
      console.log('[WebViewManager] キューが上限に達したため、古い処理を削除します');
      this.updateQueue.shift(); // 古い処理を削除
    }

    // キューに追加
    this.updateQueue.push(updateFunction);

    // 既に処理中でない場合は処理を開始
    if (!this.isProcessingQueue) {
      await this.processUpdateQueue();
    }
  }

  /**
   * 更新キューを処理
   */
  private async processUpdateQueue(): Promise<void> {
    if (this.isProcessingQueue || this.updateQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.updateQueue.length > 0) {
        const updateFunction = this.updateQueue.shift();
        if (updateFunction) {
          try {
            await updateFunction();
            this.lastUpdateTime = Date.now();
            
            // 処理間に少し間隔を空ける
            if (this.updateQueue.length > 0) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          } catch (error) {
            console.error('[WebViewManager] 更新処理でエラーが発生しました:', error);
          }
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * プレビューを閉じる
   */
  closePreview(): void {
    if (this.currentPanel) {
      console.log('[WebViewManager] プレビューを閉じます');
      this.currentPanel.dispose();
      this.currentPanel = undefined;
      this.clearCache();
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
    // 自動プレビュー設定をチェック
    const autoPreviewEnabled = ConfigManager.isAutoPreviewEnabled();
    console.log(`[WebViewManager] sendYamlToWebview called - autoPreview.enabled = ${autoPreviewEnabled}`);
    
    if (!autoPreviewEnabled) {
      console.log('[WebViewManager] 自動プレビューが無効なため、YAML送信をスキップします');
      return;
    }

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

        // ファイルサイズ制限をチェック
        if (yamlContent.length > this.MAX_YAML_SIZE) {
          console.warn(`[WebViewManager] YAMLファイルが大きすぎます: ${yamlContent.length} bytes`);
          this.currentPanel.webview.postMessage({
            type: 'error',
            message: `YAMLファイルが大きすぎます（${Math.round(yamlContent.length / 1024)}KB）。1MB以下にしてください。`
          });
          return;
        }

        // キャッシュチェック
        if (yamlContent === this.lastYamlContent && this.lastParsedData) {
          console.log('[WebViewManager] キャッシュされたデータを使用');
          this.performanceMonitor.recordCacheHit(true);
          this.sendMessageToWebView(this.lastParsedData, fileName);
          return;
        }

        this.performanceMonitor.recordCacheHit(false);

        // 既存のパースタイマーをクリア
        if (this.parseTimeout) {
          clearTimeout(this.parseTimeout);
        }

        // YAMLパース処理をより安全に非同期で実行
        let yaml;
        try {
          // パース処理をより長いタイムアウトで非同期化
          yaml = await new Promise((resolve, reject) => {
            this.parseTimeout = setTimeout(() => {
              try {
                // メモリ使用量を監視
                const memBefore = process.memoryUsage().heapUsed;
                console.log(`[WebViewManager] パース前メモリ使用量: ${Math.round(memBefore / 1024 / 1024)}MB`);
                
                const parsed = YAML.parse(yamlContent);
                
                const memAfter = process.memoryUsage().heapUsed;
                console.log(`[WebViewManager] パース後メモリ使用量: ${Math.round(memAfter / 1024 / 1024)}MB`);
                console.log(`[WebViewManager] メモリ増加量: ${Math.round((memAfter - memBefore) / 1024 / 1024)}MB`);
                
                resolve(parsed);
              } catch (error) {
                reject(error);
              }
            }, 10); // 10ms遅延でUIスレッドを解放
          });
        } catch (parseError) {
          console.error('[WebViewManager] YAMLパースエラー:', parseError);
          this.currentPanel.webview.postMessage({
            type: 'error',
            message: `YAMLの解析に失敗しました: ${parseError}`
          });
          return;
        }

        console.log(`[WebViewManager] YAML解析成功、WebViewに送信: ${fileName}`);
        
        // キャッシュを更新（メモリ制限付き）
        this.lastYamlContent = yamlContent;
        this.lastParsedData = yaml;
        
        // メモリ使用量が大きい場合は古いキャッシュをクリア
        const memUsage = process.memoryUsage();
        if (memUsage.heapUsed > 100 * 1024 * 1024) { // 100MB以上
          console.log('[WebViewManager] メモリ使用量が大きいため、古いキャッシュをクリアします');
          this.lastYamlContent = '';
          this.lastParsedData = null;
        }
        
        this.sendMessageToWebView(yaml, fileName);
        console.log(`[WebViewManager] メッセージ送信完了`);
      } catch (error) {
        console.error('[WebViewManager] YAMLデータの送信に失敗しました:', error);
        if (this.currentPanel) {
        this.currentPanel.webview.postMessage({
          type: 'error',
          message: `YAMLの解析に失敗しました: ${error}`
        });
        }
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
    if (this.parseTimeout) {
      clearTimeout(this.parseTimeout);
      this.parseTimeout = undefined;
    }
    this.updateQueue = [];
    this.isProcessingQueue = false;
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
    console.log('[WebViewManager] applyThemeVariables called with CSS:', css);
    if (!this.currentPanel) {
      console.log('[WebViewManager] applyThemeVariables: no current panel');
      return;
    }
    console.log('[WebViewManager] applyThemeVariables: sending theme-variables message');
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