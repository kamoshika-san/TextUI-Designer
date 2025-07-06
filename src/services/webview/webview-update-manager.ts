import { WebViewLifecycleManager } from './webview-lifecycle-manager';
import { YamlParser, ParsedYamlResult } from './yaml-parser';
import { UpdateQueueManager } from './update-queue-manager';
import { CacheManager } from './cache-manager';
import { WebViewErrorHandler } from './webview-error-handler';
import { ConfigManager } from '../../utils/config-manager';
import { ErrorHandler } from '../../utils/error-handler';
import { IWebViewUpdateManagerTest, TextUIDSL } from '../../types';

/**
 * リファクタリングされたWebViewUpdateManager
 * 各専用クラスに処理を委譲し、ファサードパターンで統一インターフェースを提供
 */
export class WebViewUpdateManager implements IWebViewUpdateManagerTest {
  private lifecycleManager: WebViewLifecycleManager;
  private yamlParser: YamlParser;
  private updateQueueManager: UpdateQueueManager;
  private cacheManager: CacheManager;
  private errorHandler: WebViewErrorHandler;
  private lastTuiFile: string | undefined = undefined;
  private isUpdating: boolean = false;
  private _lastYamlContent: string = '';
  private _lastParsedData: TextUIDSL | null = null;
  private currentParameters: Record<string, any> = {
    showWelcome: true,
    showAdvanced: false,
    userRole: 'user',
    welcomeMessage: 'ようこそ！'
  };

  constructor(lifecycleManager: WebViewLifecycleManager) {
    this.lifecycleManager = lifecycleManager;
    this.yamlParser = new YamlParser();
    this.updateQueueManager = new UpdateQueueManager();
    this.cacheManager = new CacheManager();
    this.errorHandler = new WebViewErrorHandler(lifecycleManager);
  }

  /**
   * プレビューを更新（デバウンス付き）
   */
  async updatePreview(forceUpdate: boolean = false): Promise<void> {
    if (this.lifecycleManager.hasPanel()) {
      // プレビュー画面が開かれている場合は常に更新
      if (forceUpdate) {
        console.log('[WebViewUpdateManager] 強制更新を実行');
        await this.updateQueueManager.queueUpdate(
          () => this.sendYamlToWebview(true),
          true,
          10 // 高優先度
        );
      } else {
        // デバウンス付きで更新
        this.updateQueueManager.queueUpdateWithDebounce(
          () => this.sendYamlToWebview(true),
          200
        );
      }
    } else {
      // プレビューが開かれていない場合は自動プレビュー設定をチェック
      const autoPreviewEnabled = ConfigManager.isAutoPreviewEnabled();
      
      if (autoPreviewEnabled) {
        console.log('[WebViewUpdateManager] 自動プレビューが有効なため、プレビューを開きます');
      } else {
        console.log('[WebViewUpdateManager] 自動プレビューが無効なため、プレビューを開きません');
      }
    }
  }

  /**
   * 最後に開いたtui.ymlファイルを設定
   */
  setLastTuiFile(filePath: string, updatePreview: boolean = false): void {
    console.log(`[WebViewUpdateManager] setLastTuiFile called: ${filePath}, updatePreview: ${updatePreview}`);
    
    // ファイルが変更された場合はキャッシュとエラー状態をクリア
    if (this.lastTuiFile !== filePath) {
      console.log(`[WebViewUpdateManager] ファイルが変更されました: ${this.lastTuiFile} -> ${filePath}`);
      this.cacheManager.clearCacheForFile(this.lastTuiFile || '');
      this.errorHandler.clearErrorState(this.lastTuiFile);
      
      // プレビュー更新が要求された場合、即座に更新
      if (updatePreview && this.lifecycleManager.hasPanel()) {
        console.log('[WebViewUpdateManager] ファイル変更による即座のプレビュー更新を実行します');
        this.updateQueueManager.queueUpdate(
          () => this.sendYamlToWebview(true),
          true,
          10 // 高優先度
        );
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
  async sendYamlToWebview(forceUpdate: boolean = false): Promise<void> {
    // 自動プレビュー設定をチェック（明示的な実行時はスキップ）
    if (!forceUpdate) {
      const autoPreviewEnabled = ConfigManager.isAutoPreviewEnabled();
      
      if (!autoPreviewEnabled) {
        console.log('[WebViewUpdateManager] 自動プレビューが無効なため、YAML送信をスキップします');
        return;
      }
    }

    if (!this.lifecycleManager.hasPanel() || this.isUpdating) {
      console.log('[WebViewUpdateManager] パネルが存在しないか、更新中です');
      return;
    }

    this.isUpdating = true;

    try {
      // キャッシュチェック（forceUpdateがtrueの場合はスキップ）
      if (!forceUpdate) {
        const cachedData = this.cacheManager.getCachedData(this.lastTuiFile || '', '');
        if (cachedData) {
          this.sendMessageToWebView(cachedData, this.lastTuiFile || '');
          return;
        }
      }

      // YAMLファイルを解析
      const parsedResult = await this.yamlParser.parseYamlFile(this.lastTuiFile);
      
      // キャッシュに保存
      this.cacheManager.setCachedData(
        parsedResult.fileName,
        parsedResult.content,
        parsedResult.data
      );

      // WebViewにデータを送信
      this.sendMessageToWebView(parsedResult.data, parsedResult.fileName);

      // メモリ使用量をチェック
      this.cacheManager.checkMemoryUsage();

    } catch (error: any) {
      console.error('[WebViewUpdateManager] YAML送信処理でエラーが発生しました:', error);
      
      // エラータイプに応じて適切なエラーハンドリング
      if (error.name === 'YamlParseError') {
        this.errorHandler.sendParseError(error, this.lastTuiFile || '', '');
      } else if (error.name === 'SchemaValidationError') {
        this.errorHandler.sendSchemaError(error, this.lastTuiFile || '', '');
      } else if (error.name === 'FileSizeError') {
        this.errorHandler.sendFileSizeError(0, this.lastTuiFile || '');
      } else {
        ErrorHandler.showError('プレビューの更新に失敗しました', error);
      }
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * パラメータを更新してプレビューを再描画
   */
  updateParameters(parameters: Record<string, any>): void {
    console.log('[WebViewUpdateManager] パラメータを更新:', parameters);
    this.currentParameters = { ...this.currentParameters, ...parameters };
    
    // パラメータ変更によりプレビューを再描画
    if (this.lifecycleManager.hasPanel()) {
      this.updateQueueManager.queueUpdate(
        () => this.sendYamlToWebviewWithParameters(true),
        true,
        5 // 高優先度
      );
    }
  }

  /**
   * パラメータ付きでWebViewにYAMLデータを送信
   */
  private async sendYamlToWebviewWithParameters(forceUpdate: boolean = false): Promise<void> {
    if (!this.lifecycleManager.hasPanel() || this.isUpdating) {
      console.log('[WebViewUpdateManager] パネルが存在しないか、更新中です');
      return;
    }

    this.isUpdating = true;

    try {
      // YAMLファイルを解析（パラメータ付き）
      const parsedResult = await this.yamlParser.parseYamlFileWithParameters(
        this.lastTuiFile, 
        this.currentParameters
      );
      
      // WebViewにデータを送信
      this.sendMessageToWebView(parsedResult.data, parsedResult.fileName);

    } catch (error: any) {
      console.error('[WebViewUpdateManager] パラメータ付きYAML送信処理でエラーが発生しました:', error);
      ErrorHandler.showError('パラメータ付きプレビューの更新に失敗しました', error);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * WebViewにメッセージを送信
   */
  private sendMessageToWebView(data: any, fileName: string): void {
    const panel = this.lifecycleManager.getPanel();
    if (!panel) {
      return;
    }

    panel.webview.postMessage({
      type: 'update',
      data: data,
      fileName: fileName
    });
  }

  /**
   * 開発者ツールを開く
   */
  openDevTools(): void {
    const panel = this.lifecycleManager.getPanel();
    if (panel) {
      panel.webview.postMessage({ type: 'openDevTools' });
    } else {
      const vscode = require('vscode');
      vscode.window.showWarningMessage('プレビューが開かれていません。先にプレビューを開いてください。');
    }
  }

  /**
   * テスト用メモリ管理メソッド（IWebViewUpdateManagerTestインターフェース実装）
   */
  _testMemoryManagement(): void {
    console.log('[WebViewUpdateManager] テスト用メモリ管理を実行');
    this.cacheManager.checkMemoryUsage();
  }

  /**
   * テスト用: YAMLキャッシュ内容を取得（IWebViewUpdateManagerTestインターフェース実装）
   */
  _getYamlCacheContent(): string {
    return this.cacheManager._getCacheContent(this.lastTuiFile || '') || '';
  }

  /**
   * テスト用: YAMLキャッシュをクリア（IWebViewUpdateManagerTestインターフェース実装）
   */
  _clearYamlCache(): void {
    this.cacheManager._clearCache();
  }

  /**
   * テスト用: YAMLキャッシュ内容を設定（IWebViewUpdateManagerTestインターフェース実装）
   */
  _setYamlCacheContent(content: string): void {
    // テスト用のダミーデータをキャッシュに設定
    this.lastTuiFile = 'test.tui.yml';
    this.cacheManager.setCachedData('test.tui.yml', content, content);
  }

  /**
   * テスト用: YAMLキャッシュ内容を取得/設定（IWebViewUpdateManagerTestインターフェース実装）
   */
  get lastYamlContent(): string {
    return this._lastYamlContent;
  }
  
  set lastYamlContent(val: string) {
    this._lastYamlContent = val;
    this._setYamlCacheContent(val);
  }

  get lastParsedData(): TextUIDSL | null {
    return this._lastParsedData;
  }
  
  set lastParsedData(val: TextUIDSL | null) {
    this._lastParsedData = val;
  }

  /**
   * キューの状態を取得
   */
  getQueueStatus() {
    return this.updateQueueManager.getQueueStatus();
  }

  /**
   * キャッシュの統計情報を取得
   */
  getCacheStats() {
    return this.cacheManager.getCacheStats();
  }

  /**
   * エラー統計を取得
   */
  getErrorStats() {
    return this.errorHandler.getErrorStats();
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    this.updateQueueManager.dispose();
    this.cacheManager.dispose();
    this.errorHandler.dispose();
  }
} 