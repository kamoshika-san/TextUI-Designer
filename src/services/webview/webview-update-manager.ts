import { WebViewLifecycleManager } from './webview-lifecycle-manager';
import { YamlParser, YamlSchemaLoader } from './yaml-parser';
import { UpdateQueueManager } from './update-queue-manager';
import { PreviewUpdateCoordinator, PreviewUpdatePhase } from './preview-update-coordinator';
import { PreviewYamlSourceResolver } from './preview-yaml-source-resolver';
import { WebViewPreviewCacheManager } from './cache-manager';
import { WebViewErrorHandler } from './webview-error-handler';
import { ConfigManager } from '../../utils/config-manager';
import { Logger } from '../../utils/logger';
import { deliverPreviewPayload } from './preview-webview-deliver';
import { PreviewUpdateSessionState, shouldBlockYamlSend } from './preview-update-session-state';
import { parseValidateYamlForPreview } from './preview-parser-validator-port';
import { lookupPreviewCacheData } from './preview-cache-port';
import { applyPreviewFailurePolicy } from './preview-failure-policy';
import type {
  IWebViewUpdateQueue,
  PreviewFailurePolicyApplyFn,
  WebViewUpdateManagerDeps
} from './webview-update-manager-deps';

/**
 * YAML キャッシュのテスト観測口。単体テストは本オブジェクト経由で読み書きし、
 * `_getYamlCacheContent` 等を直接呼ばない（T-104）。
 */
export interface WebViewYamlCacheTestAdapter {
  getYamlCacheContent(): string;
  clearYamlCache(): void;
  setYamlCacheContent(content: string): void;
}

/**
 * プレビュー更新の **オーケストレーションのみ**（T-077 / T-093 / T-106）。
 *
 * 5 ポート（責務の所在）:
 * - **SourceResolver**: `preview-yaml-source-resolver.ts`（`PreviewYamlSourceResolver`）
 * - **PreviewParserValidator**: `preview-parser-validator-port.ts`（`parseValidateYamlForPreview`）
 * - **PreviewCache**: `preview-cache-port.ts`（lookup）+ `WebViewPreviewCacheManager`（格納・メモリ）
 * - **PreviewDelivery**: `preview-webview-deliver.ts`（`deliverPreviewPayload`）
 * - **PreviewFailurePolicy**: `preview-failure-policy.ts`（`applyPreviewFailurePolicy`）
 *
 * 正本: `docs/preview-update-pipeline-ports.md`
 *
 * **テスト用差し替え（T-210）**: 第3引数 `deps` でキュー・キャッシュ・失敗ポリシーを注入可能。
 * 例: `tests/helpers/direct-webview-update-queue.js` を `updateQueueManager` に渡すとデバウンス待ちが不要。
 */
export class WebViewUpdateManager {
  private lifecycleManager: WebViewLifecycleManager;
  private yamlParser: YamlParser;
  private updateQueueManager: IWebViewUpdateQueue;
  private previewUpdateCoordinator: PreviewUpdateCoordinator;
  private yamlSourceResolver: PreviewYamlSourceResolver;
  private cacheManager: WebViewPreviewCacheManager;
  private errorHandler: WebViewErrorHandler;
  private readonly applyFailurePolicy: PreviewFailurePolicyApplyFn;
  private readonly session = new PreviewUpdateSessionState();
  private readonly logger = new Logger('WebViewUpdateManager');

  constructor(
    lifecycleManager: WebViewLifecycleManager,
    schemaLoader?: YamlSchemaLoader,
    deps?: WebViewUpdateManagerDeps
  ) {
    this.lifecycleManager = lifecycleManager;
    this.yamlParser = new YamlParser(schemaLoader);
    this.updateQueueManager = deps?.updateQueueManager ?? new UpdateQueueManager();
    this.previewUpdateCoordinator = new PreviewUpdateCoordinator();
    this.yamlSourceResolver = new PreviewYamlSourceResolver(() => this.session.lastTuiFile, this.logger);
    this.cacheManager = deps?.cacheManager ?? new WebViewPreviewCacheManager();
    this.errorHandler = new WebViewErrorHandler(lifecycleManager);
    this.applyFailurePolicy = deps?.applyFailurePolicy ?? applyPreviewFailurePolicy;
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
        this.logger.debug('自動プレビューが有効なため、プレビューを開きます');
      } else {
        this.logger.debug('自動プレビューが無効なため、プレビューを開きません');
      }
    }
  }

  /**
   * 最後に開いたtui.ymlファイルを設定
   */
  setLastTuiFile(filePath: string, updatePreview: boolean = false): void {
    console.log(`[WebViewUpdateManager] setLastTuiFile called: ${filePath}, updatePreview: ${updatePreview}`);
    
    // ファイルが変更された場合はキャッシュとエラー状態をクリア
    if (this.session.lastTuiFile !== filePath) {
      this.logger.debug(`ファイルが変更されました: ${this.session.lastTuiFile} -> ${filePath}`);
      this.cacheManager.clearCacheForFile(this.session.lastTuiFile || '');
      this.errorHandler.clearErrorState(this.session.lastTuiFile);
      
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
    
    this.session.lastTuiFile = filePath;
  }

  /**
   * 最後に開いていたtui.ymlファイルのパスを取得
   */
  getLastTuiFile(): string | undefined {
    return this.session.lastTuiFile;
  }

  /**
   * WebViewにYAMLデータを送信（キャッシュ付き）
   */
  async sendYamlToWebview(forceUpdate: boolean = false): Promise<void> {
    // 自動プレビュー設定をチェック（明示的な実行時はスキップ）
    if (!forceUpdate) {
      const autoPreviewEnabled = ConfigManager.isAutoPreviewEnabled();
      
      if (!autoPreviewEnabled) {
        this.logger.debug('自動プレビューが無効なため、YAML送信をスキップします');
        return;
      }
    }

    if (shouldBlockYamlSend({ hasPanel: this.lifecycleManager.hasPanel(), isUpdating: this.session.isUpdating })) {
      this.logger.debug('パネルが存在しないか、更新中です');
      return;
    }

    this.session.isUpdating = true;
    this.previewUpdateCoordinator.beginPipeline();

    try {
      this.previewUpdateCoordinator.setPhase(PreviewUpdatePhase.ResolvingSource);
      const currentYaml = await this.yamlSourceResolver.resolveCurrentYamlForCache();

      this.previewUpdateCoordinator.setPhase(PreviewUpdatePhase.CacheLookup);
      if (currentYaml) {
        const cachedData = lookupPreviewCacheData(
          this.cacheManager,
          currentYaml.fileName,
          currentYaml.content,
          forceUpdate
        );
        if (cachedData) {
          this.previewUpdateCoordinator.setPhase(PreviewUpdatePhase.Delivering);
          deliverPreviewPayload(this.lifecycleManager, cachedData, currentYaml.fileName);
          return;
        }
      }

      // YAMLファイルを解析
      this.previewUpdateCoordinator.setPhase(PreviewUpdatePhase.Parsing);
      const parsedResult = await parseValidateYamlForPreview(
        this.yamlParser,
        currentYaml?.fileName || this.session.lastTuiFile
      );
      this.previewUpdateCoordinator.setPhase(PreviewUpdatePhase.Validating);
      this.session.lastTuiFile = parsedResult.fileName;
      
      // キャッシュに保存
      this.cacheManager.setCachedData(
        parsedResult.fileName,
        parsedResult.content,
        parsedResult.data
      );

      // WebViewにデータを送信
      this.previewUpdateCoordinator.setPhase(PreviewUpdatePhase.Delivering);
      deliverPreviewPayload(this.lifecycleManager, parsedResult.data, parsedResult.fileName);

      // メモリ使用量をチェック
      this.cacheManager.checkMemoryUsage();

    } catch (error: unknown) {
      this.previewUpdateCoordinator.markFailed();
      console.error('[WebViewUpdateManager] YAML送信処理でエラーが発生しました:', error);
      this.applyFailurePolicy(error, {
        errorHandler: this.errorHandler,
        lastTuiFile: this.session.lastTuiFile || ''
      });
    } finally {
      this.previewUpdateCoordinator.endPipeline();
      this.session.isUpdating = false;
    }
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
    this.logger.debug('テスト用メモリ管理を実行');
    this.cacheManager.checkMemoryUsage();
  }

  /**
   * YAML キャッシュを単体テストから観測するためのアダプタ。テストはここ経由のみを使用する。
   */
  createYamlCacheTestAdapter(): WebViewYamlCacheTestAdapter {
    return {
      getYamlCacheContent: () => this.readYamlCacheContentForTest(),
      clearYamlCache: () => this.clearYamlCacheForTest(),
      setYamlCacheContent: (content: string) => this.setYamlCacheContentForTest(content),
    };
  }

  private readYamlCacheContentForTest(): string {
    return this.cacheManager._getCacheContent(this.session.lastTuiFile || '') || '';
  }

  private clearYamlCacheForTest(): void {
    this.cacheManager._clearCache();
  }

  private setYamlCacheContentForTest(content: string): void {
    this.session.lastTuiFile = 'test.tui.yml';
    this.cacheManager.setCachedData('test.tui.yml', content, content);
  }

  /**
   * キューの状態を取得
   */
  getQueueStatus() {
    return this.updateQueueManager.getQueueStatus();
  }

  /** プレビュー更新パイプラインの現在フェーズ（デバッグ・テスト用） */
  getPreviewUpdatePhase(): PreviewUpdatePhase {
    return this.previewUpdateCoordinator.getPhase();
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
   * テスト用: lastYamlContent へのアクセサ（内部は createYamlCacheTestAdapter と同じ経路）
   */
  get lastYamlContent(): string {
    return this.readYamlCacheContentForTest();
  }
  set lastYamlContent(content: string) {
    this.setYamlCacheContentForTest(content);
  }

  /**
   * テスト用: lastParsedData へのアクセサ
   * YAMLキャッシュの解析済みデータを取得/設定
   */
  get lastParsedData(): unknown {
    return this.cacheManager._getCachedData(this.session.lastTuiFile || '') ?? null;
  }
  set lastParsedData(val: unknown) {
    const fileName = this.session.lastTuiFile || '';
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
