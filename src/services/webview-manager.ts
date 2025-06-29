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
  private readonly MIN_UPDATE_INTERVAL = 50; // より短い間隔に変更（リアルタイム性向上）
  private readonly MAX_YAML_SIZE: number = 1024 * 1024; // 1MB制限
  private readonly MAX_QUEUE_SIZE: number = 5; // キューサイズ制限

  constructor(context: vscode.ExtensionContext, themeManager?: ThemeManager) {
    this.context = context;
    this.themeManager = themeManager;
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
            // プレビューが開かれた場合は常にYAMLデータを送信
            await this.sendYamlToWebview(true);
            if (this.themeManager) {
              this.applyThemeVariables(this.themeManager.generateCSSVariables());
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
      // プレビュー画面が開かれている場合は常に更新
      // 既存のタイマーをクリア
      if (this.updateTimeout) {
        clearTimeout(this.updateTimeout);
      }

      // より短いデバウンス時間（200ms）でリアルタイム性を向上
      this.updateTimeout = setTimeout(async () => {
        await this.queueUpdate(() => this.sendYamlToWebview(true));
      }, 200);
    } else {
      // プレビューが開かれていない場合は自動プレビュー設定をチェック
      const autoPreviewEnabled = ConfigManager.isAutoPreviewEnabled();
      
      if (autoPreviewEnabled) {
        // 自動プレビューが有効な場合は自動的に開く
        await this.openPreview();
      } else {
        console.log('[WebViewManager] 自動プレビューが無効なため、プレビューを開きません');
      }
    }
  }

  /**
   * 更新処理をキューに追加（競合状態を防ぐ）
   */
  private async queueUpdate(updateFunction: () => Promise<void>): Promise<void> {
    // 設定から最小更新間隔を取得
    const performanceSettings = ConfigManager.getPerformanceSettings();
    const minInterval = performanceSettings.minUpdateInterval;
    
    // 最小更新間隔をチェック（短縮してリアルタイム性を向上）
    const now = Date.now();
    if (now - this.lastUpdateTime < minInterval) {
      console.log(`[WebViewManager] 最小更新間隔（${minInterval}ms）を待機中...`);
      return;
    }

    // キューサイズ制限をチェック
    if (this.updateQueue.length >= this.MAX_QUEUE_SIZE) {
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
            
            // 処理間に少し間隔を空ける（短縮してリアルタイム性を向上）
            if (this.updateQueue.length > 0) {
              await new Promise(resolve => setTimeout(resolve, 20));
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
   * 最後に開いたtui.ymlファイルを設定
   */
  setLastTuiFile(filePath: string, updatePreview: boolean = false): void {
    console.log(`[WebViewManager] setLastTuiFile called: ${filePath}, updatePreview: ${updatePreview}`);
    
    // ファイルが変更された場合はキャッシュをクリア
    if (this.lastTuiFile !== filePath) {
      console.log(`[WebViewManager] ファイルが変更されました: ${this.lastTuiFile} -> ${filePath}`);
      this.clearCache();
      
      // プレビュー更新が要求された場合、即座に更新
      if (updatePreview && this.currentPanel) {
        console.log('[WebViewManager] ファイル変更による即座のプレビュー更新を実行します');
        this.queueUpdate(() => this.sendYamlToWebview(true));
      }
    }
    
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
  private async sendYamlToWebview(forceUpdate: boolean = false): Promise<void> {
    // 自動プレビュー設定をチェック（明示的な実行時はスキップ）
    if (!forceUpdate) {
      const autoPreviewEnabled = ConfigManager.isAutoPreviewEnabled();
      
      if (!autoPreviewEnabled) {
        console.log('[WebViewManager] 自動プレビューが無効なため、YAML送信をスキップします');
        return;
      }
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

        if (activeEditor && activeEditor.document.fileName.endsWith('.tui.yml')) {
          yamlContent = activeEditor.document.getText();
          fileName = activeEditor.document.fileName;
          
          // アクティブエディタのファイルが変更された場合はキャッシュをクリア
          if (this.lastTuiFile !== fileName) {
            console.log(`[WebViewManager] アクティブエディタのファイルが変更されました: ${this.lastTuiFile} -> ${fileName}`);
            this.clearCache();
          }
          
          this.setLastTuiFile(fileName);
          console.log(`[WebViewManager] アクティブエディタからYAMLを取得: ${fileName}`);
        } else if (this.lastTuiFile) {
          // アクティブなエディタがない場合は最後に開いていたファイルを使用
          const document = await vscode.workspace.openTextDocument(this.lastTuiFile);
          yamlContent = document.getText();
          fileName = this.lastTuiFile;
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

        // キャッシュチェック（forceUpdateがtrueの場合はスキップ）
        if (!forceUpdate && yamlContent === this.lastYamlContent && this.lastParsedData && this.lastTuiFile === fileName) {
          console.log('[WebViewManager] キャッシュされたデータを使用');
          this.performanceMonitor.recordCacheHit(true);
          this.sendMessageToWebView(this.lastParsedData, fileName);
          return;
        }

        this.performanceMonitor.recordCacheHit(false);

        // YAMLパース処理を非同期で実行
        let yaml;
        try {
          yaml = await new Promise((resolve, reject) => {
            setImmediate(() => {
              try {
                const parsed = YAML.parse(yamlContent);
                resolve(parsed);
              } catch (error) {
                reject(error);
              }
            });
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
        
        // 定期的なキャッシュクリーンアップ（50MB以上で実行）
        if (memUsage.heapUsed > 50 * 1024 * 1024) {
          console.log('[WebViewManager] メモリ使用量が50MBを超えたため、キャッシュをクリアします');
          this.lastYamlContent = '';
          this.lastParsedData = null;
        }
        
        this.sendMessageToWebView(yaml, fileName);
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
    if (!this.currentPanel) {return;}

    const message = {
      type: 'update',
      data: data,
      fileName: fileName
    };
    
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
      return;
    }
    this.currentPanel.webview.postMessage({
      type: 'theme-change',
      theme: theme
    });
  }
} 