import * as vscode from 'vscode';
import { WebViewManager } from './webview-manager';
import { ExportService } from './export-service';
import { TemplateService } from './template-service';
import { SettingsService } from './settings-service';
import { SchemaManager } from './schema-manager';

/**
 * コマンド管理サービス
 * VS Code拡張のコマンド登録と実行を担当
 */
export class CommandManager {
  private context: vscode.ExtensionContext;
  private webViewManager: WebViewManager;
  private exportService: ExportService;
  private templateService: TemplateService;
  private settingsService: SettingsService;
  private schemaManager: SchemaManager;

  constructor(
    context: vscode.ExtensionContext,
    webViewManager: WebViewManager,
    exportService: ExportService,
    templateService: TemplateService,
    settingsService: SettingsService,
    schemaManager: SchemaManager
  ) {
    this.context = context;
    this.webViewManager = webViewManager;
    this.exportService = exportService;
    this.templateService = templateService;
    this.settingsService = settingsService;
    this.schemaManager = schemaManager;
  }

  /**
   * すべてのコマンドを登録
   */
  registerCommands(): void {
    this.registerPreviewCommand();
    this.registerExportCommand();
    this.registerDevToolsCommand();
    this.registerTemplateCommands();
    this.registerSettingsCommands();
    this.registerSchemaCommands();
  }

  /**
   * プレビューコマンドを登録
   */
  private registerPreviewCommand(): void {
    const disposable = vscode.commands.registerCommand('textui-designer.openPreview', async () => {
      await this.webViewManager.openPreview();
    });
    this.context.subscriptions.push(disposable);
  }

  /**
   * エクスポートコマンドを登録
   */
  private registerExportCommand(): void {
    const disposable = vscode.commands.registerCommand('textui-designer.export', async () => {
      const lastTuiFile = this.webViewManager.getLastTuiFile();
      await this.exportService.executeExport(lastTuiFile);
    });
    this.context.subscriptions.push(disposable);
  }

  /**
   * 開発者ツールコマンドを登録
   */
  private registerDevToolsCommand(): void {
    const disposable = vscode.commands.registerCommand('textui-designer.openDevTools', () => {
      this.webViewManager.openDevTools();
    });
    this.context.subscriptions.push(disposable);
  }

  /**
   * テンプレート関連コマンドを登録
   */
  private registerTemplateCommands(): void {
    // 新規テンプレート作成コマンド
    const createTemplateDisposable = vscode.commands.registerCommand('textui-designer.createTemplate', async () => {
      await this.templateService.createTemplate();
    });
    this.context.subscriptions.push(createTemplateDisposable);

    // テンプレート挿入コマンド
    const insertTemplateDisposable = vscode.commands.registerCommand('textui-designer.insertTemplate', async () => {
      await this.templateService.insertTemplate();
    });
    this.context.subscriptions.push(insertTemplateDisposable);
  }

  /**
   * 設定関連コマンドを登録
   */
  private registerSettingsCommands(): void {
    // 設定を開くコマンド
    const openSettingsDisposable = vscode.commands.registerCommand('textui-designer.openSettings', async () => {
      await this.settingsService.openSettings();
    });
    this.context.subscriptions.push(openSettingsDisposable);

    // 設定をリセットコマンド
    const resetSettingsDisposable = vscode.commands.registerCommand('textui-designer.resetSettings', async () => {
      await this.settingsService.resetSettings();
    });
    this.context.subscriptions.push(resetSettingsDisposable);

    // 設定を表示コマンド
    const showSettingsDisposable = vscode.commands.registerCommand('textui-designer.showSettings', async () => {
      await this.settingsService.showSettings();
    });
    this.context.subscriptions.push(showSettingsDisposable);
  }

  /**
   * スキーマ関連コマンドを登録
   */
  private registerSchemaCommands(): void {
    // スキーマ再初期化コマンド
    const reinitializeSchemasDisposable = vscode.commands.registerCommand('textui-designer.reinitializeSchemas', async () => {
      try {
        await this.schemaManager.reinitialize();
        vscode.window.showInformationMessage('スキーマを再初期化しました。');
      } catch (error) {
        vscode.window.showErrorMessage(`スキーマの再初期化に失敗しました: ${error}`);
      }
    });
    this.context.subscriptions.push(reinitializeSchemasDisposable);

    // スキーマデバッグコマンド
    const debugSchemasDisposable = vscode.commands.registerCommand('textui-designer.debugSchemas', async () => {
      try {
        await this.schemaManager.debugSchemas();
        vscode.window.showInformationMessage('スキーマ状態をデバッグ出力しました。開発者ツールのコンソールを確認してください。');
      } catch (error) {
        vscode.window.showErrorMessage(`スキーマデバッグに失敗しました: ${error}`);
      }
    });
    this.context.subscriptions.push(debugSchemasDisposable);
  }
} 