import * as vscode from 'vscode';
import { WebViewManager } from './webview-manager';
import { ExportService } from './export-service';
import { TemplateService } from './template-service';
import { SettingsService } from './settings-service';
import { SchemaManager } from './schema-manager';
import { ErrorHandler } from '../utils/error-handler';
import { ConfigManager } from '../utils/config-manager';
import { RuntimeInspectionService } from './runtime-inspection-service';

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
  private runtimeInspectionService: RuntimeInspectionService;

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
    this.runtimeInspectionService = new RuntimeInspectionService();
  }

  /**
   * コマンドを登録
   */
  registerCommands(): void {
    console.log('[CommandManager] コマンド登録を開始');
    
    // プレビュー関連
    this.registerCommand('textui-designer.openPreview', () => this.openPreviewWithCheck());
    this.registerCommand('textui-designer.openDevTools', () => this.webViewManager.openDevTools());

    // エクスポート関連
    this.registerCommand('textui-designer.export', (filePath?: string) => this.exportService.executeExport(filePath));

    // テンプレート関連
    this.registerCommand('textui-designer.createTemplate', () => this.templateService.createTemplate());
    this.registerCommand('textui-designer.insertTemplate', () => this.templateService.insertTemplate());

    // 設定関連
    this.registerCommand('textui-designer.openSettings', () => this.settingsService.openSettings());
    this.registerCommand('textui-designer.resetSettings', () => this.settingsService.resetSettings());
    this.registerCommand('textui-designer.showSettings', () => this.settingsService.showAutoPreviewSetting());
    this.registerCommand('textui-designer.checkAutoPreviewSetting', () => this.checkAutoPreviewSetting());

    // スキーマ関連
    this.registerCommand('textui-designer.reinitializeSchemas', () => this.schemaManager.reinitialize());
    this.registerCommand('textui-designer.debugSchemas', () => this.schemaManager.debugSchemas());

    // パフォーマンス関連
    this.registerCommand('textui-designer.showPerformanceReport', () => this.runtimeInspectionService.showPerformanceReport());
    this.registerCommand('textui-designer.clearPerformanceMetrics', () => this.runtimeInspectionService.clearPerformanceMetrics());
    this.registerCommand('textui-designer.togglePerformanceMonitoring', () => this.runtimeInspectionService.togglePerformanceMonitoring());
    this.registerCommand('textui-designer.enablePerformanceMonitoring', () => this.runtimeInspectionService.enablePerformanceMonitoring());
    this.registerCommand('textui-designer.generateSampleEvents', () => this.runtimeInspectionService.generateSampleEvents());
    
    // メモリ追跡関連
    this.registerCommand('textui-designer.showMemoryReport', () => this.runtimeInspectionService.showMemoryReport());
    this.registerCommand('textui-designer.toggleMemoryTracking', () => this.runtimeInspectionService.toggleMemoryTracking());
    this.registerCommand('textui-designer.enableMemoryTracking', () => this.runtimeInspectionService.enableMemoryTracking());
    
    console.log('[CommandManager] コマンド登録完了');
  }

  /**
   * 自動プレビュー設定を確認
   */
  private async checkAutoPreviewSetting(): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      const autoPreviewEnabled = ConfigManager.isAutoPreviewEnabled();
      const message = `自動プレビュー設定: ${autoPreviewEnabled ? 'ON' : 'OFF'}`;
      console.log(`[CommandManager] ${message}`);
      ErrorHandler.showInfo(message);
    }, '自動プレビュー設定の確認に失敗しました');

    if (!result) {
      // エラーハンドリングは既にErrorHandlerで処理済み
      return;
    }
  }

  /**
   * コマンドを登録
   */
  private registerCommand(command: string, callback: (...args: any[]) => void): void {
    console.log(`[CommandManager] コマンドを登録: ${command}`);
    const disposable = vscode.commands.registerCommand(command, callback);
    this.context.subscriptions.push(disposable);
    console.log(`[CommandManager] コマンド登録成功: ${command}`);
  }

  /**
   * プレビューを開く（ユーザーの明示的な指示による実行）
   */
  private async openPreviewWithCheck(): Promise<void> {
    console.log('[CommandManager] openPreviewWithCheck が呼び出されました');
    try {
      console.log('[CommandManager] WebViewManager.openPreview を呼び出します');
      // ユーザーが明示的にコマンドを実行した場合は、Auto Preview設定に関係なくプレビューを開く
      await this.webViewManager.openPreview();
      console.log('[CommandManager] WebViewManager.openPreview が完了しました');
    } catch (error) {
      console.error('[CommandManager] プレビュー表示エラー:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`プレビューの表示に失敗しました: ${errorMessage}`);
    }
  }
} 