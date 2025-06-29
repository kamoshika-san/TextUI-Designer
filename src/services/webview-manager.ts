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

    // 現在のアクティブエディタを記録（プレビュー後にフォーカスを戻すため）
    const activeEditor = vscode.window.activeTextEditor;
    const shouldReturnFocus = activeEditor && activeEditor.document.fileName.endsWith('.tui.yml');

    if (this.currentPanel) {
      this.currentPanel.reveal(columnToShowIn);
      // 既存のプレビューの場合も、フォーカスを戻す
      if (shouldReturnFocus && activeEditor) {
        setTimeout(async () => {
          try {
            await vscode.window.showTextDocument(activeEditor.document, vscode.ViewColumn.One);
            console.log('[WebViewManager] プレビュー表示後にtui.ymlファイルにフォーカスを戻しました');
          } catch (error) {
            console.log('[WebViewManager] フォーカスを戻すことができませんでした:', error);
          }
        }, 200);
      }
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
            
            // WebView初期化完了後にフォーカスを戻す
            if (shouldReturnFocus && activeEditor) {
              setTimeout(async () => {
                try {
                  await vscode.window.showTextDocument(activeEditor.document, vscode.ViewColumn.One);
                  console.log('[WebViewManager] WebView初期化完了後にtui.ymlファイルにフォーカスを戻しました');
                } catch (error) {
                  console.log('[WebViewManager] フォーカスを戻すことができませんでした:', error);
                }
              }, 300);
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
  async updatePreview(forceUpdate: boolean = false): Promise<void> {
    if (this.currentPanel) {
      // プレビュー画面が開かれている場合は常に更新
      // 既存のタイマーをクリア
      if (this.updateTimeout) {
        clearTimeout(this.updateTimeout);
      }

      // 強制更新の場合は即座に実行、そうでなければデバウンス
      if (forceUpdate) {
        console.log('[WebViewManager] 強制更新を実行');
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
            // ファイル切り替え時にエラー状態もクリア
            this.clearErrorState();
            // ファイル切り替え時は強制更新を実行
            forceUpdate = true;
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
          
          // エラー時にキャッシュを確実にクリア
          this.clearCache();
          
          // 詳細なエラー情報を作成
          const errorDetails = this.createDetailedErrorInfo(parseError, yamlContent, fileName);
          
          // 詳細エラーメッセージを送信
          this.currentPanel.webview.postMessage({
            type: 'parseError',
            error: errorDetails,
            fileName: fileName,
            content: yamlContent
          });
          return;
        }

        console.log(`[WebViewManager] YAML解析成功、スキーマバリデーションを実行: ${fileName}`);
        
        // スキーマバリデーションを実行
        const validationResult = await this.validateYamlSchema(yaml, yamlContent, fileName);
        
        if (validationResult.hasErrors) {
          console.log('[WebViewManager] スキーマバリデーションエラーが検出されました');
          console.log('[WebViewManager] エラー詳細:', validationResult.errorDetails);
          
          // エラー時にキャッシュを確実にクリア
          this.clearCache();
          
          // 詳細スキーマエラー情報を送信
          const message = {
            type: 'schemaError',
            error: validationResult.errorDetails,
            fileName: fileName,
            content: yamlContent
          };
          console.log('[WebViewManager] WebViewにスキーマエラーメッセージを送信:', message);
          this.currentPanel.webview.postMessage(message);
          return;
        }
        
        // 正常な解析時はエラー状態をクリア
        this.clearErrorState();
        
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
   * エラー状態をクリア
   */
  private clearErrorState(): void {
    if (this.currentPanel) {
      // 正常な状態に戻った際に、エラー表示をクリア
      this.currentPanel.webview.postMessage({
        type: 'clearError'
      });
    }
  }

  /**
   * 詳細なエラー情報を作成
   */
  private createDetailedErrorInfo(error: any, yamlContent: string, fileName: string) {
    const lines = yamlContent.split('\n');
    let lineNumber = 1;
    let columnNumber = 1;
    let errorContext = '';
    let suggestions: string[] = [];

    // YAMLパースエラーから行番号と列番号を抽出
    if (error && typeof error.message === 'string') {
      const lineMatch = error.message.match(/at line (\d+)/i);
      const columnMatch = error.message.match(/column (\d+)/i);
      
      if (lineMatch) {
        lineNumber = parseInt(lineMatch[1], 10);
      }
      if (columnMatch) {
        columnNumber = parseInt(columnMatch[1], 10);
      }

      // エラー位置の前後の行を取得してコンテキストを作成
      const startLine = Math.max(0, lineNumber - 3);
      const endLine = Math.min(lines.length, lineNumber + 2);
      
      errorContext = lines.slice(startLine, endLine)
        .map((line, index) => {
          const actualLineNumber = startLine + index + 1;
          const isErrorLine = actualLineNumber === lineNumber;
          const prefix = isErrorLine ? '→ ' : '  ';
          const lineNumStr = actualLineNumber.toString().padStart(3, ' ');
          
          if (isErrorLine) {
            // エラー行の場合、問題箇所を強調
            const pointer = ' '.repeat(columnNumber + 5) + '^';
            return `${prefix}${lineNumStr}| ${line}\n${pointer}`;
          }
          return `${prefix}${lineNumStr}| ${line}`;
        })
        .join('\n');

      // エラータイプに基づく修正提案
      suggestions = this.generateErrorSuggestions(error.message, lines[lineNumber - 1]);
    }

    return {
      message: error.message || 'YAMLパースエラーが発生しました',
      lineNumber,
      columnNumber,
      errorContext,
      suggestions,
      fileName: fileName.split(/[/\\]/).pop() || fileName, // ファイル名のみ取得
      fullPath: fileName
    };
  }

  /**
   * エラータイプに基づく修正提案を生成
   */
  private generateErrorSuggestions(errorMessage: string, errorLine: string): string[] {
    const suggestions: string[] = [];

    if (errorMessage.includes('duplicate key') || errorMessage.includes('重複')) {
      suggestions.push('❌ 同じキーが重複しています。キー名を確認してください。');
    }
    
    if (errorMessage.includes('unexpected') || errorMessage.includes('expected')) {
      suggestions.push('❌ YAML構文エラーです。インデント（スペース）を確認してください。');
      suggestions.push('💡 TABではなくスペースを使用してください。');
    }
    
    if (errorMessage.includes('mapping') || errorMessage.includes('sequence')) {
      suggestions.push('❌ オブジェクト構造が正しくありません。');
      suggestions.push('💡 コロン(:)の後にスペースが必要です。');
    }

    if (errorLine) {
      // 一般的なYAMLエラーパターンをチェック
      if (errorLine.includes('\t')) {
        suggestions.push('❌ TAB文字が検出されました。スペースに置き換えてください。');
      }
      
      if (errorLine.match(/:\s*\[.*[^\\]\]$/) && !errorLine.includes(']:')) {
        suggestions.push('❌ 配列の閉じ括弧が不正です。');
      }
      
      if (errorLine.includes('{{') || errorLine.includes('}}')) {
        suggestions.push('❌ テンプレート構文は使用できません。');
      }
    }

    // デフォルトの提案
    if (suggestions.length === 0) {
      suggestions.push('💡 YAML構文を確認してください。');
      suggestions.push('💡 インデントはスペース2個で統一してください。');
      suggestions.push('💡 文字列に特殊文字が含まれる場合は引用符で囲んでください。');
    }

    return suggestions;
  }

  /**
   * スキーマバリデーションを実行
   */
  private async validateYamlSchema(yaml: any, yamlContent: string, fileName: string) {
    try {
      console.log('[WebViewManager] スキーマバリデーション開始');
      
      // SchemaManagerインスタンスを取得（グローバル変数から）
      const schemaManager = (global as any).globalSchemaManager;
      if (!schemaManager) {
        console.log('[WebViewManager] SchemaManagerが見つからないため、バリデーションをスキップします');
        return { hasErrors: false };
      }
      console.log('[WebViewManager] SchemaManagerを取得しました');

      // スキーマをロード
      const schema = await schemaManager.loadSchema();
      if (!schema) {
        console.log('[WebViewManager] スキーマが見つからないため、バリデーションをスキップします');
        return { hasErrors: false };
      }
      console.log('[WebViewManager] スキーマをロードしました');

      // Ajvでバリデーション実行
      const Ajv = require('ajv');
      const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
      const validate = ajv.compile(schema);
      const valid = validate(yaml);

      console.log('[WebViewManager] バリデーション結果:', valid);
      if (!valid && validate.errors) {
        console.log('[WebViewManager] バリデーションエラー詳細:', validate.errors);
        const errorDetails = this.createSchemaErrorDetails(validate.errors, yamlContent, fileName);
        console.log('[WebViewManager] エラー詳細を作成しました:', errorDetails);
        return {
          hasErrors: true,
          errorDetails
        };
      }

      console.log('[WebViewManager] スキーマバリデーション成功');
      return { hasErrors: false };
    } catch (error) {
      console.error('[WebViewManager] スキーマバリデーション中にエラーが発生:', error);
      return { hasErrors: false }; // バリデーションエラーの場合はスキップ
    }
  }

  /**
   * スキーマエラーの詳細情報を作成
   */
  private createSchemaErrorDetails(errors: any[], yamlContent: string, fileName: string) {
    const lines = yamlContent.split('\n');
    const primaryError = errors[0]; // 最初のエラーを主要エラーとして扱う
    
    let lineNumber = 1;
    let columnNumber = 1;
    let errorContext = '';
    let suggestions: string[] = [];

    // エラーパスから該当する行を特定
    const errorPath = primaryError.instancePath || primaryError.dataPath || '';
    const errorField = errorPath.split('/').filter(Boolean).pop() || primaryError.params?.missingProperty;
    
    if (errorField) {
      // フィールド名から行を検索
      const fieldRegex = new RegExp(`^\\s*${errorField}\\s*:`, 'm');
      const match = yamlContent.match(fieldRegex);
      
      if (match) {
        const matchIndex = yamlContent.indexOf(match[0]);
        lineNumber = yamlContent.substring(0, matchIndex).split('\n').length;
        columnNumber = match[0].length;

        // エラー位置の前後の行を取得
        const startLine = Math.max(0, lineNumber - 3);
        const endLine = Math.min(lines.length, lineNumber + 2);
        
        errorContext = lines.slice(startLine, endLine)
          .map((line, index) => {
            const actualLineNumber = startLine + index + 1;
            const isErrorLine = actualLineNumber === lineNumber;
            const prefix = isErrorLine ? '→ ' : '  ';
            const lineNumStr = actualLineNumber.toString().padStart(3, ' ');
            
            if (isErrorLine) {
              const pointer = ' '.repeat(columnNumber + 5) + '^';
              return `${prefix}${lineNumStr}| ${line}\n${pointer}`;
            }
            return `${prefix}${lineNumStr}| ${line}`;
          })
          .join('\n');
      }
    }

    // スキーマエラータイプに基づく修正提案
    suggestions = this.generateSchemaErrorSuggestions(primaryError, errors);

    return {
      message: this.formatSchemaErrorMessage(primaryError),
      lineNumber,
      columnNumber,
      errorContext,
      suggestions,
      fileName: fileName.split(/[/\\]/).pop() || fileName,
      fullPath: fileName,
      allErrors: errors.map(err => ({
        path: err.instancePath || err.dataPath || '',
        message: err.message,
        allowedValues: err.params?.allowedValues
      }))
    };
  }

  /**
   * スキーマエラーメッセージをフォーマット
   */
  private formatSchemaErrorMessage(error: any): string {
    const path = error.instancePath || error.dataPath || '';
    const field = path.split('/').filter(Boolean).pop() || error.params?.missingProperty || 'フィールド';
    
    switch (error.keyword) {
      case 'required':
        return `必須フィールド "${error.params?.missingProperty}" が不足しています`;
      case 'enum':
        return `"${field}" の値が無効です。許可される値: ${error.params?.allowedValues?.join(', ')}`;
      case 'type':
        return `"${field}" の型が正しくありません。期待される型: ${error.params?.type}`;
      case 'minLength':
        return `"${field}" の値が短すぎます。最小文字数: ${error.params?.limit}`;
      case 'maxLength':
        return `"${field}" の値が長すぎます。最大文字数: ${error.params?.limit}`;
      default:
        return error.message || `"${field}" でスキーマエラーが発生しました`;
    }
  }

  /**
   * スキーマエラータイプに基づく修正提案を生成
   */
  private generateSchemaErrorSuggestions(primaryError: any, allErrors: any[]): string[] {
    const suggestions: string[] = [];
    
    switch (primaryError.keyword) {
      case 'required':
        suggestions.push(`❌ 必須フィールド "${primaryError.params?.missingProperty}" を追加してください。`);
        suggestions.push('💡 YAML の構造を確認し、不足しているプロパティを追加してください。');
        break;
        
      case 'enum':
        const allowedValues = primaryError.params?.allowedValues || [];
        suggestions.push(`❌ 許可されていない値です。使用可能な値: ${allowedValues.join(', ')}`);
        suggestions.push('💡 大文字・小文字も確認してください。');
        break;
        
      case 'type':
        const expectedType = primaryError.params?.type;
        suggestions.push(`❌ 値の型が正しくありません。期待される型: ${expectedType}`);
        if (expectedType === 'string') {
          suggestions.push('💡 文字列値は引用符で囲んでください。');
        }
        break;
        
      default:
        suggestions.push('❌ スキーマ定義に従って値を修正してください。');
        break;
    }

    // 空の値の場合の特別な提案
    const errorPath = primaryError.instancePath || primaryError.dataPath || '';
    if (primaryError.keyword === 'type' && !primaryError.data) {
      suggestions.push('❌ 値が空です。適切な値を設定してください。');
      suggestions.push('💡 コロン(:)の後に値を記述してください。');
    }

    // 一般的な提案
    suggestions.push('💡 JSON Schema 定義を確認してください。');
    suggestions.push('💡 サンプルファイルを参考にしてください。');
    
    return suggestions;
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