import * as vscode from 'vscode';
import { SchemaManager } from './services/schema-manager';
import { WebViewManager } from './services/webview-manager';
import { DiagnosticManager } from './services/diagnostic-manager';
import { TextUICompletionProvider } from './services/completion-provider';
import { CommandManager } from './services/command-manager';
import { ExportService } from './services/export-service';
import { TemplateService } from './services/template-service';
import { SettingsService } from './services/settings-service';
import { ExportManager } from './exporters';
import { ErrorHandler } from './utils/error-handler';
import { ConfigManager } from './utils/config-manager';
import { PerformanceMonitor } from './utils/performance-monitor';
import { TextUIMemoryTracker } from './utils/textui-memory-tracker';
import { ThemeManager } from './services/theme-manager';

// グローバル変数としてSchemaManagerを保存
let globalSchemaManager: SchemaManager | undefined;
let themeManagerInstance: ThemeManager | undefined;
let globalDiagnosticManager: DiagnosticManager | undefined;

/**
 * サポートされているファイルかチェック
 */
function isSupportedFile(fileName: string): boolean {
	return fileName.endsWith('.tui.yml') || fileName.endsWith('.tui.yaml');
}

/**
 * 拡張機能のアクティベーション
 */
export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "textui-designer" is now active!');
  console.log('[Extension] アクティベーション開始');

  // パフォーマンス監視の開始
  const startTime = Date.now();
  console.log('TextUI Designer拡張をアクティブ化中...');
  
  // パフォーマンスモニターの初期化
  const performanceMonitor = PerformanceMonitor.getInstance();

  // 設定値の確認
  const autoPreviewEnabled = ConfigManager.isAutoPreviewEnabled();

  // 開発モードではパフォーマンス監視を有効化
  // if (process.env.NODE_ENV === 'development') {
  //   performanceMonitor.setEnabled(true);
  // }
  
  // パフォーマンス監視を強制的に有効化（デバッグ用）
  performanceMonitor.forceEnable();

  // メモリ追跡システムの初期化
  const memoryTracker = TextUIMemoryTracker.getInstance();
  console.log('[Extension] メモリ追跡システムを初期化しました');

  // サービスの初期化
  try {
    console.log('[Extension] SchemaManager を作成します');
    const schemaManager = new SchemaManager(context);
    globalSchemaManager = schemaManager; // グローバルに保存
    
    // SchemaManagerをグローバル変数として保存（WebViewManagerからアクセス可能にする）
    (global as any).globalSchemaManager = schemaManager;
    console.log('[Extension] SchemaManager 作成完了');
    
    console.log('[Extension] ThemeManager を作成します');
    const themeManager = new ThemeManager(context);
    themeManagerInstance = themeManager;
    console.log('[Extension] ThemeManager 作成完了');
    
    console.log('[Extension] WebViewManager を作成します');
    const webViewManager = new WebViewManager(context, themeManager);
    console.log('[Extension] WebViewManager 作成完了');
  
  console.log('[Extension] ExportManager を作成します');
  const exportManager = new ExportManager();
  const exportService = new ExportService(exportManager);
  console.log('[Extension] ExportManager 作成完了');
  
  console.log('[Extension] TemplateService を作成します');
  const templateService = new TemplateService();
  console.log('[Extension] TemplateService 作成完了');
  
  console.log('[Extension] SettingsService を作成します');
  const settingsService = new SettingsService();
  console.log('[Extension] SettingsService 作成完了');
  
  console.log('[Extension] DiagnosticManager を作成します');
  const diagnosticManager = new DiagnosticManager(schemaManager);
  globalDiagnosticManager = diagnosticManager;
  console.log('[Extension] DiagnosticManager 作成完了');
  
  console.log('[Extension] CompletionProvider を作成します');
  const completionProvider = new TextUICompletionProvider(schemaManager);
  console.log('[Extension] CompletionProvider 作成完了');
  
    console.log('[Extension] CommandManager を作成します');
    const commandManager = new CommandManager(
      context, 
      webViewManager, 
      exportService, 
      templateService,
      settingsService,
      schemaManager
    );
    console.log('[Extension] CommandManager 作成完了');

    // スキーマの初期化
    console.log('[Extension] スキーマ初期化を開始します');
    schemaManager.initialize().catch(error => {
      console.error('スキーマの初期化に失敗しました:', error);
      ErrorHandler.showWarning(
        'TextUI Designer: スキーマの初期化に失敗しました。IntelliSense機能が制限される可能性があります。'
      );
    });
    console.log('[Extension] スキーマ初期化完了');

    // コマンドの登録
    console.log('[Extension] CommandManager.registerCommands を呼び出します');
    commandManager.registerCommands();
    console.log('[Extension] CommandManager.registerCommands が完了しました');

  // テーマ読み込み
  themeManager.loadTheme().then(() => {
    webViewManager.applyThemeVariables(themeManager.generateCSSVariables());
  });
  themeManager.watchThemeFile(css => {
    webViewManager.applyThemeVariables(css);
  });

  // 補完プロバイダーの登録
  const completionDisposable = vscode.languages.registerCompletionItemProvider(
    [
      { language: 'yaml' },
      { language: 'yaml', scheme: 'file' },
      { language: 'yaml', scheme: 'untitled' }
    ],
    completionProvider,
    '-', ':', ' ' // トリガー文字を追加
  );
  context.subscriptions.push(completionDisposable);

  // 設定変更の監視
  const settingsWatcher = settingsService.startWatching(() => {
    // Auto Preview設定の変更は、プレビュー画面の自動表示/非表示のみに影響
    // 既に開かれているプレビュー画面は維持する
    
    // スキーマ関連の設定が変更された場合は再初期化
    const schemaSettings = ConfigManager.getSchemaSettings();
    if (schemaSettings.validationEnabled) {
      schemaManager.reinitialize().catch(error => {
        console.error('スキーマの再初期化に失敗しました:', error);
      });
    }
  });
  context.subscriptions.push(settingsWatcher);

  // ファイル変更の監視（デバウンス付き）
  let activeEditorTimeout: NodeJS.Timeout | undefined;
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor && isSupportedFile(editor.document.fileName)) {
        // 既存のタイマーをクリア
        if (activeEditorTimeout) {
          clearTimeout(activeEditorTimeout);
        }

        // デバウンス処理（100ms）- より短くしてリアルタイム性を向上
        activeEditorTimeout = setTimeout(() => {
          const previousFile = webViewManager.getLastTuiFile();
          
          // ファイルが変更された場合は常にプレビューを更新
          if (previousFile !== editor.document.fileName) {
            console.log('[AutoPreview] ファイルが変更されたため、プレビューを更新します');
            
            // ファイル変更時に即座のプレビュー更新を有効にしてsetLastTuiFileを呼び出し
            webViewManager.setLastTuiFile(editor.document.fileName, true);
            
            // 自動プレビュー設定をチェック
            const autoPreviewEnabled = ConfigManager.isAutoPreviewEnabled();
            console.log(`[AutoPreview] アクティブエディタ変更時の設定値: ${autoPreviewEnabled ? 'ON' : 'OFF'}, パネル存在: ${webViewManager.hasPanel()}`);
            console.log(`[AutoPreview] ファイル: ${editor.document.fileName}`);
            console.log(`[AutoPreview] 前のファイル: ${previousFile}`);
            
            if (autoPreviewEnabled) {
              if (!webViewManager.hasPanel()) {
                console.log('[AutoPreview] 自動プレビューを開きます');
                webViewManager.openPreview();
              }
            }
          } else {
            // ファイルが同じ場合は通常のsetLastTuiFileを呼び出し
            webViewManager.setLastTuiFile(editor.document.fileName);
          }
        }, 100);
      }
    })
  );

  // ドキュメント保存時の診断（重複処理を防ぐ）
  let saveTimeout: NodeJS.Timeout | undefined;
  let isSaving = false; // 保存中フラグを追加
  let lastSaveTime = 0; // 最後の保存時刻を記録
  
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(document => {
      if (isSupportedFile(document.fileName)) {
        const now = Date.now();
        lastSaveTime = now;
        
        // 保存中フラグを設定
        isSaving = true;
        
        // 既存のタイマーをクリア
        if (saveTimeout) {
          clearTimeout(saveTimeout);
          saveTimeout = undefined;
        }

        // 保存処理をデバウンス（100ms）
        saveTimeout = setTimeout(() => {
          try {
            const diagnosticSettings = ConfigManager.getDiagnosticSettings();
            if (diagnosticSettings.enabled && diagnosticSettings.validateOnSave) {
              diagnosticManager.validateAndReportDiagnostics(document);
            }
          } catch (error) {
            console.error('[Extension] ドキュメント保存処理でエラーが発生しました:', error);
          } finally {
            // 保存処理完了後、少し遅延してからフラグをリセット
            setTimeout(() => {
              isSaving = false;
            }, 500);
          }
        }, 100);
      }
    })
  );

  // ドキュメント変更の監視（デバウンス付き）
  let documentChangeTimeout: NodeJS.Timeout | undefined;
  let lastChangeTime: number = 0;
  const MIN_CHANGE_INTERVAL = 100; // より短い間隔に変更（リアルタイム性向上）
  let changeCount = 0; // 変更回数をカウント
  const MAX_CHANGES_PER_SECOND = 15; // 1秒あたりの最大変更回数を増加（リアルタイム性向上）

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(event => {
      if (isSupportedFile(event.document.fileName)) {
        const now = Date.now();
        
        // 保存直後（1秒以内）は変更処理をスキップ（短縮）
        if (now - lastSaveTime < 1000) {
          return;
        }
        
        // 保存中は変更処理をスキップ
        if (isSaving) {
          return;
        }

        // 変更回数制限をチェック
        changeCount++;
        if (changeCount > MAX_CHANGES_PER_SECOND) {
          return;
        }

        // 1秒後にカウンターをリセット
        setTimeout(() => {
          changeCount = 0;
        }, 1000);

        // 最小変更間隔をチェック
        if (now - lastChangeTime < MIN_CHANGE_INTERVAL) {
          return;
        }
        lastChangeTime = now;

        // ドキュメントサイズをチェック
        const documentSize = event.document.getText().length;
        if (documentSize > 1024 * 1024) { // 1MB以上
          console.log(`[Extension] ドキュメントサイズが大きすぎます: ${Math.round(documentSize / 1024)}KB`);
          vscode.window.showWarningMessage(`ドキュメントサイズが大きすぎます（${Math.round(documentSize / 1024)}KB）。1MB以下にしてください。`);
          return;
        }

        // 既存のタイマーをクリア
        if (documentChangeTimeout) {
          clearTimeout(documentChangeTimeout);
        }

        // より短いデバウンス処理（300ms）でリアルタイム性を向上
        documentChangeTimeout = setTimeout(async () => {
          try {
            // メモリ使用量を段階的に監視
            const memUsage = process.memoryUsage();
            const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
            
            // 段階的警告システム
            if (memUsage.heapUsed > 800 * 1024 * 1024) { // 800MB以上 - CRITICAL
              console.error(`[Extension] メモリ使用量が危険レベルです: ${memUsageMB}MB`);
              vscode.window.showErrorMessage(
                `メモリ使用量が危険レベルです（${memUsageMB}MB）。すぐにVS Codeを再起動してください。`,
                '今すぐ再起動', 'しばらく様子を見る'
              ).then(selection => {
                if (selection === '今すぐ再起動') {
                  vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
              });
              return;
            } else if (memUsage.heapUsed > 600 * 1024 * 1024) { // 600MB以上 - WARN
              console.warn(`[Extension] メモリ使用量が多めです: ${memUsageMB}MB（Extension Host全体、他拡張含む）`);
              vscode.window.showWarningMessage(
                `メモリ使用量が多めです（${memUsageMB}MB）。他の拡張機能も含めた使用量です。`,
                'VS Code再起動', '無視'
              ).then(selection => {
                if (selection === 'VS Code再起動') {
                  vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
              });
            } else if (memUsage.heapUsed > 400 * 1024 * 1024) { // 400MB以上 - INFO
              console.log(`[Extension] メモリ使用量: ${memUsageMB}MB（Extension Host全体）`);
            }

            // プレビュー画面が開かれている場合は常に更新
            // Auto Preview設定はプレビュー画面を自動で開くかどうかのみに影響
            await webViewManager.updatePreview();
            
            const diagnosticSettings = ConfigManager.getDiagnosticSettings();
            if (diagnosticSettings.enabled && diagnosticSettings.validateOnChange) {
              diagnosticManager.validateAndReportDiagnostics(event.document);
            }
          } catch (error) {
            console.error('[Extension] ドキュメント変更処理でエラーが発生しました:', error);
          }
        }, 150);
      }
    })
  );

  // ドキュメントを開いた時の診断
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(document => {
      const diagnosticSettings = ConfigManager.getDiagnosticSettings();
      if (diagnosticSettings.enabled) {
        diagnosticManager.validateAndReportDiagnostics(document);
      }
    })
  );

  // ドキュメントを閉じた時の診断クリア
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument(document => {
      diagnosticManager.clearDiagnosticsForUri(document.uri);
    })
  );

  // VSCodeテーマ変更の監視
  context.subscriptions.push(
    vscode.window.onDidChangeActiveColorTheme(colorTheme => {
      // WebViewにテーマ変更を通知
      const theme = colorTheme.kind === vscode.ColorThemeKind.Light ? 'light' : 'dark';
      webViewManager.notifyThemeChange(theme);
    })
  );

  // 設定変更の監視
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('textui-designer.autoPreview.enabled')) {
        // 設定変更時の処理は既にsettingsWatcherで処理済み
      }
    })
  );

  // パフォーマンス監視の終了
  const endTime = Date.now();
  const activationTime = endTime - startTime;
  console.log(`[Performance] 拡張機能のアクティベーション完了: ${activationTime}ms`);
  performanceMonitor.recordEvent('export', activationTime, { type: 'activation' });

  // メモリ使用量の定期監視
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    // 段階的監視（定期監視は警告レベルのみ）
    if (memUsage.heapUsed > 700 * 1024 * 1024) { // 700MB以上 - 定期監視での警告
      console.warn(`[Performance] 定期監視: メモリ使用量が多めです: ${memUsageMB}MB（Extension Host全体）`);
      vscode.window.showWarningMessage(
        `定期監視: メモリ使用量が多めです（${memUsageMB}MB）。VS Codeの再起動を検討してください。`,
        '再起動', '無視'
      ).then(selection => {
        if (selection === '再起動') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      });
    } else if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB以上 - 情報ログ
      console.log(`[Performance] 定期監視: メモリ使用量 ${memUsageMB}MB（Extension Host全体）`);
    }
  }, 60000); // 60秒ごと（適切な間隔に調整）

  } catch (error) {
    console.error('[Extension] サービス初期化中にエラーが発生しました:', error);
    console.error('[Extension] エラー詳細:', error);
    if (error instanceof Error) {
      console.error('[Extension] スタックトレース:', error.stack);
    }
    vscode.window.showErrorMessage(`TextUI Designer拡張の初期化に失敗しました: ${error}`);
    throw error; // エラーを再スローして拡張の起動を失敗させる
  }
}

/**
 * 拡張機能の非アクティベーション
 */
export function deactivate() {
  // パフォーマンスモニターのクリーンアップ
  const performanceMonitor = PerformanceMonitor.getInstance();
  performanceMonitor.dispose();

  // メモリ追跡システムのクリーンアップ
  const memoryTracker = TextUIMemoryTracker.getInstance();
  memoryTracker.dispose();
  console.log('[Extension] メモリ追跡システムをクリーンアップしました');

  // スキーマのクリーンアップ
  console.log('TextUI Designer拡張を非アクティブ化中...');
  
  if (globalSchemaManager) {
    globalSchemaManager.cleanup().catch(error => {
      console.error('スキーマのクリーンアップに失敗しました:', error);
    });
    globalSchemaManager = undefined;
  }

  // 診断マネージャーのクリーンアップ
  if (globalDiagnosticManager) {
    globalDiagnosticManager.clearCache();
    globalDiagnosticManager.dispose();
  }

  themeManagerInstance?.dispose?.();

  console.log('TextUI Designer拡張の非アクティベーション完了');
} 