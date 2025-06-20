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

// グローバル変数としてSchemaManagerを保存
let globalSchemaManager: SchemaManager | undefined;

/**
 * 拡張機能のアクティベーション
 */
export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "textui-designer" is now active!');

  // サービスの初期化
  const schemaManager = new SchemaManager(context);
  globalSchemaManager = schemaManager; // グローバルに保存
  
  const webViewManager = new WebViewManager(context);
  const exportManager = new ExportManager();
  const exportService = new ExportService(exportManager);
  const templateService = new TemplateService();
  const settingsService = new SettingsService();
  const diagnosticManager = new DiagnosticManager(schemaManager);
  const completionProvider = new TextUICompletionProvider(schemaManager);
  const commandManager = new CommandManager(
    context, 
    webViewManager, 
    exportService, 
    templateService,
    settingsService,
    schemaManager
  );

  // スキーマの初期化
  schemaManager.initialize().catch(error => {
    console.error('スキーマの初期化に失敗しました:', error);
    ErrorHandler.showWarning(
      'TextUI Designer: スキーマの初期化に失敗しました。IntelliSense機能が制限される可能性があります。'
    );
  }).then(() => {
    // 初期化後にデバッグ情報を出力
    schemaManager.debugSchemas().catch(error => {
      console.error('スキーマデバッグに失敗しました:', error);
    });
  });

  // コマンドの登録
  commandManager.registerCommands();

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
    // 設定が変更された時の処理
    console.log('TextUI Designer設定が変更されました');
    
    // スキーマ関連の設定が変更された場合は再初期化
    const schemaSettings = ConfigManager.getSchemaSettings();
    if (schemaSettings.validationEnabled) {
      schemaManager.reinitialize().catch(error => {
        console.error('スキーマの再初期化に失敗しました:', error);
      });
    }
  });
  context.subscriptions.push(settingsWatcher);

  // ファイル変更の監視
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor && isSupportedFile(editor.document.fileName)) {
        webViewManager.setLastTuiFile(editor.document.fileName);
        // プレビューが開かれていない場合は自動的に開く
        if (ConfigManager.isAutoPreviewEnabled() && !webViewManager.hasPanel()) {
          webViewManager.openPreview();
        } else {
          webViewManager.updatePreview();
				}
			}
		})
	);

  // ドキュメント変更の監視
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(event => {
			if (isSupportedFile(event.document.fileName)) {
        webViewManager.updatePreview();
        
        const diagnosticSettings = ConfigManager.getDiagnosticSettings();
        if (diagnosticSettings.enabled && diagnosticSettings.validateOnChange) {
          diagnosticManager.validateAndReportDiagnostics(event.document);
        }
			}
		})
	);

  // ドキュメント保存時の診断
	context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(document => {
      const diagnosticSettings = ConfigManager.getDiagnosticSettings();
      if (diagnosticSettings.enabled && diagnosticSettings.validateOnSave) {
        diagnosticManager.validateAndReportDiagnostics(document);
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
}

/**
 * 拡張機能の非アクティベーション
 */
export function deactivate() {
  // スキーマのクリーンアップ
  console.log('TextUI Designer拡張を非アクティブ化中...');
  
  if (globalSchemaManager) {
    globalSchemaManager.cleanup().catch(error => {
      console.error('スキーマのクリーンアップに失敗しました:', error);
    });
    globalSchemaManager = undefined;
  }
}

/**
 * サポートされているファイルかどうかをチェック
 */
function isSupportedFile(fileName: string): boolean {
  const supportedExtensions = ConfigManager.getSupportedFileExtensions();
  return supportedExtensions.some(ext => fileName.endsWith(ext));
} 