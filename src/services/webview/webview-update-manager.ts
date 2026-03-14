import * as vscode from 'vscode';
import { WebViewLifecycleManager } from './webview-lifecycle-manager';
import { YamlParser, ParsedYamlResult, YamlSchemaLoader } from './yaml-parser';
import { UpdateQueueManager } from './update-queue-manager';
import { CacheManager } from './cache-manager';
import { WebViewErrorHandler } from './webview-error-handler';
import { ConfigManager } from '../../utils/config-manager';
import { ErrorHandler } from '../../utils/error-handler';
import { resolveImageSourcesInDsl } from '../../utils/image-source-resolver';
import * as path from 'path';

/**
 * リファクタリングされたWebViewUpdateManager
 * 各専用クラスに処理を委譲し、ファサードパターンで統一インターフェースを提供
 */
export class WebViewUpdateManager {
  private lifecycleManager: WebViewLifecycleManager;
  private yamlParser: YamlParser;
  private updateQueueManager: UpdateQueueManager;
  private cacheManager: CacheManager;
  private errorHandler: WebViewErrorHandler;
  private lastTuiFile: string | undefined = undefined;
  private isUpdating: boolean = false;
  private readonly isNamedError = (value: unknown, expectedName: string): value is Error =>
    value instanceof Error && value.name === expectedName;

  constructor(lifecycleManager: WebViewLifecycleManager, schemaLoader?: YamlSchemaLoader) {
    this.lifecycleManager = lifecycleManager;
    this.yamlParser = new YamlParser(schemaLoader);
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
          () => this.sendYamlToWebview(forceUpdate),
          true,
          10 // 高優先度
        );
      } else {
        // デバウンス付きで更新
        this.updateQueueManager.queueUpdateWithDebounce(
          () => this.sendYamlToWebview(forceUpdate),
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
          () => this.sendYamlToWebview(false),
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
      const currentYaml = await this.resolveCurrentYamlForCache();

      // キャッシュチェック（forceUpdateがtrueの場合はスキップ）
      if (!forceUpdate && currentYaml) {
        const cachedData = this.cacheManager.getCachedData(currentYaml.fileName, currentYaml.content);
        if (cachedData) {
          this.sendMessageToWebView(cachedData, currentYaml.fileName);
          return;
        }
      }

      // YAMLファイルを解析
      const parsedResult = await this.yamlParser.parseYamlFile(currentYaml?.fileName || this.lastTuiFile);
      this.lastTuiFile = parsedResult.fileName;
      
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

    } catch (error: unknown) {
      console.error('[WebViewUpdateManager] YAML送信処理でエラーが発生しました:', error);
      
      // エラータイプに応じて適切なエラーハンドリング
      if (this.isNamedError(error, 'YamlParseError')) {
        this.errorHandler.sendParseError(error, this.lastTuiFile || '', '');
      } else if (this.isNamedError(error, 'SchemaValidationError')) {
        this.errorHandler.sendSchemaError(error, this.lastTuiFile || '', '');
      } else if (this.isNamedError(error, 'FileSizeError')) {
        this.errorHandler.sendFileSizeError(0, this.lastTuiFile || '');
      } else {
        ErrorHandler.showError('プレビューの更新に失敗しました', error);
      }
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * キャッシュ参照に使う現在のYAML情報を取得
   */
  private async resolveCurrentYamlForCache(): Promise<{ fileName: string; content: string } | null> {
    const activeEditor = vscode.window.activeTextEditor;
    const activeFileName = activeEditor?.document.fileName;
    const isSupportedActiveFile = Boolean(activeFileName && ConfigManager.isSupportedFile(activeFileName));

    if (
      activeEditor &&
      activeFileName &&
      isSupportedActiveFile &&
      (!this.lastTuiFile || this.lastTuiFile === activeFileName)
    ) {
      return {
        fileName: activeFileName,
        content: activeEditor.document.getText()
      };
    }

    if (this.lastTuiFile) {
      try {
        const document = await vscode.workspace.openTextDocument(this.lastTuiFile);
        return {
          fileName: this.lastTuiFile,
          content: document.getText()
        };
      } catch (error) {
        console.warn('[WebViewUpdateManager] キャッシュ用YAMLの読み込みに失敗しました:', error);
      }
    }

    return null;
  }

  /**
   * WebViewにメッセージを送信
   */
  private sendMessageToWebView(data: unknown, fileName: string): void {
    const panel = this.lifecycleManager.getPanel();
    if (!panel) {
      return;
    }

    const normalizedData = resolveImageSourcesInDsl(data, {
      dslFileDir: path.dirname(fileName),
      mapResolvedSrc: absolutePath => panel.webview.asWebviewUri(vscode.Uri.file(absolutePath)).toString()
    });

    panel.webview.postMessage({
      type: 'update',
      data: normalizedData,
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
   * テスト用メモリ管理メソッド
   */
  _testMemoryManagement(): void {
    console.log('[WebViewUpdateManager] テスト用メモリ管理を実行');
    this.cacheManager.checkMemoryUsage();
  }

  /**
   * テスト用: YAMLキャッシュ内容を取得
   */
  _getYamlCacheContent(): string {
    return this.cacheManager._getCacheContent(this.lastTuiFile || '') || '';
  }

  /**
   * テスト用: YAMLキャッシュをクリア
   */
  _clearYamlCache(): void {
    this.cacheManager._clearCache();
  }

  /**
   * テスト用: YAMLキャッシュ内容を設定
   */
  _setYamlCacheContent(content: string): void {
    // テスト用のダミーデータをキャッシュに設定
    this.lastTuiFile = 'test.tui.yml';
    this.cacheManager.setCachedData('test.tui.yml', content, content);
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
   * テスト用: lastYamlContent へのアクセサ
   */
  get lastYamlContent(): string {
    return this._getYamlCacheContent();
  }
  set lastYamlContent(content: string) {
    this._setYamlCacheContent(content);
  }

  /**
   * テスト用: lastParsedData へのアクセサ
   * YAMLキャッシュの解析済みデータを取得/設定
   */
  get lastParsedData(): unknown {
    return this.cacheManager._getCachedData(this.lastTuiFile || '') ?? null;
  }
  set lastParsedData(val: unknown) {
    const fileName = this.lastTuiFile || '';
    const content = this.cacheManager._getCacheContent(fileName) || '';
    const normalizedValue = val === undefined ? null : val;
    this.cacheManager.setCachedData(fileName, content, normalizedValue);
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
