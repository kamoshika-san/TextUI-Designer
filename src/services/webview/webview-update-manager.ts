import * as vscode from 'vscode';
import * as YAML from 'yaml';
import { WebViewLifecycleManager } from './webview-lifecycle-manager';
import { PerformanceMonitor } from '../../utils/performance-monitor';
import { ConfigManager } from '../../utils/config-manager';
import { ErrorHandler } from '../../utils/error-handler';

/**
 * WebViewの更新処理を担当
 * YAML解析・キャッシュ・キュー管理を一元化
 */
export class WebViewUpdateManager {
  private lifecycleManager: WebViewLifecycleManager;
  private performanceMonitor: PerformanceMonitor;
  private lastTuiFile: string | undefined = undefined;
  private updateTimeout: NodeJS.Timeout | undefined = undefined;
  private lastYamlContent: string = '';
  private lastParsedData: any = null;
  private isUpdating: boolean = false;
  private updateQueue: (() => Promise<void>)[] = [];
  private isProcessingQueue: boolean = false;
  private lastUpdateTime: number = 0;
  private readonly MAX_YAML_SIZE: number = 1024 * 1024; // 1MB制限
  private readonly MAX_QUEUE_SIZE: number = 5; // キューサイズ制限

  constructor(lifecycleManager: WebViewLifecycleManager) {
    this.lifecycleManager = lifecycleManager;
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }

  /**
   * プレビューを更新（デバウンス付き）
   */
  async updatePreview(forceUpdate: boolean = false): Promise<void> {
    if (this.lifecycleManager.hasPanel()) {
      // プレビュー画面が開かれている場合は常に更新
      // 既存のタイマーをクリア
      if (this.updateTimeout) {
        clearTimeout(this.updateTimeout);
      }

      // 強制更新の場合は即座に実行、そうでなければデバウンス
      if (forceUpdate) {
        console.log('[WebViewUpdateManager] 強制更新を実行');
        await this.queueUpdate(() => this.sendYamlToWebview(true));
      } else {
        // より短いデバウンス時間（200ms）でリアルタイム性を向上
        this.updateTimeout = setTimeout(async () => {
          await this.queueUpdate(() => this.sendYamlToWebview(true));
        }, 200);
      }
    } else {
      // プレビューが開かれていない場合は自動プレビュー設定をチェック
      const autoPreviewEnabled = ConfigManager.isAutoPreviewEnabled();
      
      if (autoPreviewEnabled) {
        // 自動プレビューが有効な場合は自動的に開く
        console.log('[WebViewUpdateManager] 自動プレビューが有効なため、プレビューを開きます');
        // この部分はWebViewManagerで処理されるため、ここではログのみ
      } else {
        console.log('[WebViewUpdateManager] 自動プレビューが無効なため、プレビューを開きません');
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
      console.log(`[WebViewUpdateManager] 最小更新間隔（${minInterval}ms）を待機中...`);
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
            console.error('[WebViewUpdateManager] 更新処理でエラーが発生しました:', error);
          }
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * 最後に開いたtui.ymlファイルを設定
   */
  setLastTuiFile(filePath: string, updatePreview: boolean = false): void {
    console.log(`[WebViewUpdateManager] setLastTuiFile called: ${filePath}, updatePreview: ${updatePreview}`);
    
    // ファイルが変更された場合はキャッシュをクリア
    if (this.lastTuiFile !== filePath) {
      console.log(`[WebViewUpdateManager] ファイルが変更されました: ${this.lastTuiFile} -> ${filePath}`);
      this.clearCache();
      
      // プレビュー更新が要求された場合、即座に更新
      if (updatePreview && this.lifecycleManager.hasPanel()) {
        console.log('[WebViewUpdateManager] ファイル変更による即座のプレビュー更新を実行します');
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
  async sendYamlToWebview(forceUpdate: boolean = false): Promise<void> {
    // 自動プレビュー設定をチェック（明示的な実行時はスキップ）
    if (!forceUpdate) {
      const autoPreviewEnabled = ConfigManager.isAutoPreviewEnabled();
      
      if (!autoPreviewEnabled) {
        console.log('[WebViewUpdateManager] 自動プレビューが無効なため、YAML送信をスキップします');
        return;
      }
    }

    return this.performanceMonitor.measureRenderTime(async () => {
      if (!this.lifecycleManager.hasPanel() || this.isUpdating) {
        console.log('[WebViewUpdateManager] パネルが存在しないか、更新中です');
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
            console.log(`[WebViewUpdateManager] アクティブエディタのファイルが変更されました: ${this.lastTuiFile} -> ${fileName}`);
            this.clearCache();
            // ファイル切り替え時にエラー状態もクリア
            this.clearErrorState();
            // ファイル切り替え時は強制更新を実行
            forceUpdate = true;
          }
          
          this.setLastTuiFile(fileName);
          console.log(`[WebViewUpdateManager] アクティブエディタからYAMLを取得: ${fileName}`);
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
          console.warn(`[WebViewUpdateManager] YAMLファイルが大きすぎます: ${yamlContent.length} bytes`);
          this.sendErrorMessage(`YAMLファイルが大きすぎます（${Math.round(yamlContent.length / 1024)}KB）。1MB以下にしてください。`);
          return;
        }

        // キャッシュチェック（forceUpdateがtrueの場合はスキップ）
        if (!forceUpdate && yamlContent === this.lastYamlContent && this.lastParsedData && this.lastTuiFile === fileName) {
          console.log('[WebViewUpdateManager] キャッシュされたデータを使用');
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
          console.error('[WebViewUpdateManager] YAMLパースエラー:', parseError);
          
          // エラー時にキャッシュを確実にクリア
          this.clearCache();
          
          // 詳細なエラー情報を作成
          const errorDetails = this.createDetailedErrorInfo(parseError, yamlContent, fileName);
          
          // 詳細エラーメッセージを送信
          this.sendParseError(errorDetails, fileName, yamlContent);
          return;
        }

        console.log(`[WebViewUpdateManager] YAML解析成功、スキーマバリデーションを実行: ${fileName}`);
        
        // スキーマバリデーションを実行
        await this.validateYamlSchema(yaml, yamlContent, fileName);

        // キャッシュに保存
        this.lastYamlContent = yamlContent;
        this.lastParsedData = yaml;
        this.lastTuiFile = fileName;

        // WebViewにデータを送信
        this.sendMessageToWebView(yaml, fileName);

        // メモリ使用量をチェック
        this.checkMemoryUsage();

      } catch (error) {
        console.error('[WebViewUpdateManager] YAML送信処理でエラーが発生しました:', error);
        ErrorHandler.showError('プレビューの更新に失敗しました', error);
      } finally {
        this.isUpdating = false;
      }
    });
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
   * エラーメッセージを送信
   */
  private sendErrorMessage(message: string): void {
    const panel = this.lifecycleManager.getPanel();
    if (!panel) {
      return;
    }

    panel.webview.postMessage({
      type: 'error',
      message: message
    });
  }

  /**
   * パースエラーを送信
   */
  private sendParseError(errorDetails: any, fileName: string, content: string): void {
    const panel = this.lifecycleManager.getPanel();
    if (!panel) {
      return;
    }

    panel.webview.postMessage({
      type: 'parseError',
      error: errorDetails,
      fileName: fileName,
      content: content
    });
  }

  /**
   * キャッシュをクリア
   */
  private clearCache(): void {
    this.lastYamlContent = '';
    this.lastParsedData = null;
  }

  /**
   * エラー状態をクリア
   */
  private clearErrorState(): void {
    // エラー状態のクリア処理
    console.log('[WebViewUpdateManager] エラー状態をクリアしました');
  }

  /**
   * 詳細なエラー情報を作成
   */
  private createDetailedErrorInfo(error: any, yamlContent: string, fileName: string) {
    const errorMessage = error.message || 'Unknown error';
    const lines = yamlContent.split('\n');
    
    // エラーメッセージから行番号を抽出
    const lineMatch = errorMessage.match(/line (\d+)/i);
    const lineNumber = lineMatch ? parseInt(lineMatch[1]) - 1 : 0;
    
    const errorLine = lines[lineNumber] || '';
    const suggestions = this.generateErrorSuggestions(errorMessage, errorLine);
    
    return {
      message: errorMessage,
      line: lineNumber + 1,
      column: 0,
      errorLine: errorLine,
      suggestions: suggestions,
      fileName: fileName
    };
  }

  /**
   * エラー修正の提案を生成
   */
  private generateErrorSuggestions(errorMessage: string, errorLine: string): string[] {
    const suggestions: string[] = [];
    
    if (errorMessage.includes('duplicate key')) {
      suggestions.push('重複したキーが存在します。キー名を確認してください。');
    } else if (errorMessage.includes('mapping values')) {
      suggestions.push('YAMLの構文エラーです。インデントとコロンの使用を確認してください。');
    } else if (errorMessage.includes('unexpected end')) {
      suggestions.push('YAMLファイルが不完全です。閉じ括弧やクォートを確認してください。');
    } else if (errorMessage.includes('invalid character')) {
      suggestions.push('無効な文字が含まれています。特殊文字やエンコーディングを確認してください。');
    }
    
    return suggestions;
  }

  /**
   * YAMLスキーマバリデーションを実行
   */
  private async validateYamlSchema(yaml: any, yamlContent: string, fileName: string): Promise<void> {
    try {
      // グローバルスキーママネージャーを取得
      const globalSchemaManager = (global as any).globalSchemaManager;
      if (!globalSchemaManager) {
        console.warn('[WebViewUpdateManager] スキーママネージャーが見つかりません');
        return;
      }

      const schema = await globalSchemaManager.loadSchema();
      if (!schema) {
        console.warn('[WebViewUpdateManager] スキーマの読み込みに失敗しました');
        return;
      }

      // Ajvを使用してバリデーション
      const Ajv = require('ajv');
      const ajv = new Ajv({ allErrors: true });
      const validate = ajv.compile(schema);
      
      const valid = validate(yaml);
      
      if (!valid) {
        console.warn('[WebViewUpdateManager] スキーマバリデーションエラー:', validate.errors);
        
        // エラー詳細を作成
        const errorDetails = this.createSchemaErrorDetails(validate.errors || [], yamlContent, fileName);
        
        // スキーマエラーメッセージを送信
        this.sendSchemaError(errorDetails, fileName, yamlContent);
      }
    } catch (error) {
      console.error('[WebViewUpdateManager] スキーマバリデーションでエラーが発生しました:', error);
    }
  }

  /**
   * スキーマエラー詳細を作成
   */
  private createSchemaErrorDetails(errors: any[], yamlContent: string, fileName: string) {
    if (errors.length === 0) {
      return null;
    }

    const primaryError = errors[0];
    const errorMessage = this.formatSchemaErrorMessage(primaryError);
    const suggestions = this.generateSchemaErrorSuggestions(primaryError, errors);
    
    return {
      message: errorMessage,
      errors: errors,
      suggestions: suggestions,
      fileName: fileName
    };
  }

  /**
   * スキーマエラーメッセージをフォーマット
   */
  private formatSchemaErrorMessage(error: any): string {
    const path = error.instancePath || error.dataPath || '';
    const message = error.message || 'Unknown schema error';
    
    if (path) {
      return `スキーマエラー (${path}): ${message}`;
    }
    
    return `スキーマエラー: ${message}`;
  }

  /**
   * スキーマエラー修正の提案を生成
   */
  private generateSchemaErrorSuggestions(primaryError: any, allErrors: any[]): string[] {
    const suggestions: string[] = [];
    
    if (primaryError.keyword === 'required') {
      const missingProperty = primaryError.params.missingProperty;
      suggestions.push(`必須プロパティ "${missingProperty}" が不足しています。`);
    } else if (primaryError.keyword === 'type') {
      const expectedType = primaryError.params.type;
      suggestions.push(`プロパティの型が正しくありません。期待される型: ${expectedType}`);
    } else if (primaryError.keyword === 'enum') {
      const allowedValues = primaryError.params.allowedValues;
      suggestions.push(`無効な値です。許可される値: ${allowedValues.join(', ')}`);
    }
    
    return suggestions;
  }

  /**
   * スキーマエラーを送信
   */
  private sendSchemaError(errorDetails: any, fileName: string, content: string): void {
    const panel = this.lifecycleManager.getPanel();
    if (!panel) {
      return;
    }

    panel.webview.postMessage({
      type: 'schemaError',
      error: errorDetails,
      fileName: fileName,
      content: content
    });
  }

  /**
   * メモリ使用量をチェック
   */
  private checkMemoryUsage(): void {
    const memoryUsage = process.memoryUsage();
    const memoryMB = memoryUsage.heapUsed / 1024 / 1024;
    
    console.log(`[WebViewUpdateManager] メモリ使用量: ${memoryMB.toFixed(1)}MB`);
    
    if (memoryMB > 150) {
      console.warn(`[WebViewUpdateManager] メモリ使用量が多いため、キャッシュを強制クリアします: ${memoryMB.toFixed(1)}MB`);
      this.clearCache();
    } else if (memoryMB > 100) {
      console.warn(`[WebViewUpdateManager] メモリ使用量が多めのため、キャッシュをクリアします: ${memoryMB.toFixed(1)}MB`);
      this.clearCache();
    } else if (memoryMB > 50) {
      console.log(`[WebViewUpdateManager] メモリ使用量: ${memoryMB.toFixed(1)}MB（キャッシュ保持中）`);
    } else {
      console.log(`[WebViewUpdateManager] メモリ使用量: ${memoryMB.toFixed(1)}MB（キャッシュ完全保持中）`);
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
      vscode.window.showWarningMessage('プレビューが開かれていません。先にプレビューを開いてください。');
    }
  }

  /**
   * テスト用メモリ管理メソッド
   */
  _testMemoryManagement(): void {
    console.log('[WebViewUpdateManager] テスト用メモリ管理を実行');
    this.checkMemoryUsage();
  }

  /**
   * テスト用: YAMLキャッシュ内容を取得
   */
  _getYamlCacheContent(): string {
    return this.lastYamlContent;
  }

  /**
   * テスト用: YAMLキャッシュをクリア
   */
  _clearYamlCache(): void {
    this.lastYamlContent = '';
    this.lastParsedData = null;
  }
} 