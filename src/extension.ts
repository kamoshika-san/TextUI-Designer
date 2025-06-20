import * as vscode from 'vscode';
import { SchemaManager } from './services/schema-manager';
import { WebViewManager } from './services/webview-manager';
import { DiagnosticManager } from './services/diagnostic-manager';
import { TextUICompletionProvider } from './services/completion-provider';
import { CommandManager } from './services/command-manager';
import { ExportManager } from './exporters';

/**
 * 拡張機能のアクティベーション
 */
export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "textui-designer" is now active!');

  // サービスの初期化
  const schemaManager = new SchemaManager(context);
  const webViewManager = new WebViewManager(context);
  const exportManager = new ExportManager();
  const diagnosticManager = new DiagnosticManager(schemaManager);
  const completionProvider = new TextUICompletionProvider(schemaManager);
  const commandManager = new CommandManager(context, webViewManager, exportManager);

  // スキーマの初期化
  schemaManager.initialize().catch(error => {
    console.error('スキーマの初期化に失敗しました:', error);
    // スキーマ初期化に失敗しても拡張は動作するようにする
    vscode.window.showWarningMessage(
      'TextUI Designer: スキーマの初期化に失敗しました。IntelliSense機能が制限される可能性があります。'
    );
  });

  // コマンドの登録
  commandManager.registerCommands();

  // 補完プロバイダーの登録
  const completionDisposable = vscode.languages.registerCompletionItemProvider(
    { language: 'yaml' },
    completionProvider
  );
  context.subscriptions.push(completionDisposable);

  // ファイル変更の監視
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor && editor.document.fileName.endsWith('.tui.yml')) {
        webViewManager.setLastTuiFile(editor.document.fileName);
        // プレビューが開かれていない場合は自動的に開く
        if (!webViewManager.hasPanel()) {
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
			if (event.document.fileName.endsWith('.tui.yml')) {
        webViewManager.updatePreview();
        diagnosticManager.validateAndReportDiagnostics(event.document);
			}
		})
	);

  // ドキュメント保存時の診断
	context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(document => {
      diagnosticManager.validateAndReportDiagnostics(document);
		})
	);

  // ドキュメントを開いた時の診断
	context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(document => {
      diagnosticManager.validateAndReportDiagnostics(document);
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
  // 各サービスのクリーンアップ処理は必要に応じて実装
} 