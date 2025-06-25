import * as vscode from 'vscode';
import { WebViewManager } from './webview-manager';
import { ExportService } from './export-service';
import { TemplateService } from './template-service';
import { SettingsService } from './settings-service';
import { SchemaManager } from './schema-manager';
import { ErrorHandler } from '../utils/error-handler';
import { ConfigManager } from '../utils/config-manager';

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
   * コマンドを登録
   */
  registerCommands(): void {
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
    this.registerCommand('textui-designer.showPerformanceReport', () => this.showPerformanceReport());
    this.registerCommand('textui-designer.clearPerformanceMetrics', () => this.clearPerformanceMetrics());
    this.registerCommand('textui-designer.togglePerformanceMonitoring', () => this.togglePerformanceMonitoring());
    this.registerCommand('textui-designer.enablePerformanceMonitoring', () => this.enablePerformanceMonitoring());
    this.registerCommand('textui-designer.generateSampleEvents', () => this.generateSampleEvents());
  }

  /**
   * パフォーマンスレポートを表示
   */
  private async showPerformanceReport(): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      const { PerformanceMonitor } = await import('../utils/performance-monitor');
      const monitor = PerformanceMonitor.getInstance();
      const report = monitor.generateReport();
      
      // 新しいドキュメントでレポートを表示
      const doc = await vscode.workspace.openTextDocument({
        content: report,
        language: 'markdown'
      });
      await vscode.window.showTextDocument(doc);
      
      ErrorHandler.showInfo('パフォーマンスレポートを表示しました');
    }, 'パフォーマンスレポートの表示に失敗しました');

    if (!result) {
      // エラーハンドリングは既にErrorHandlerで処理済み
      return;
    }
  }

  /**
   * パフォーマンスメトリクスをクリア
   */
  private async clearPerformanceMetrics(): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      const { PerformanceMonitor } = await import('../utils/performance-monitor');
      const monitor = PerformanceMonitor.getInstance();
      monitor.clear();
      ErrorHandler.showInfo('パフォーマンスメトリクスをクリアしました');
    }, 'パフォーマンスメトリクスのクリアに失敗しました');

    if (!result) {
      // エラーハンドリングは既にErrorHandlerで処理済み
      return;
    }
  }

  /**
   * パフォーマンス監視の有効化/無効化を切り替え
   */
  private async togglePerformanceMonitoring(): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      const { PerformanceMonitor } = await import('../utils/performance-monitor');
      const monitor = PerformanceMonitor.getInstance();
      
      // 現在の状態を確認（簡易的な方法）
      const currentSettings = ConfigManager.getPerformanceSettings();
      const newEnabled = !currentSettings.enablePerformanceLogs;
      
      // 設定を更新
      await ConfigManager.set('performance.enablePerformanceLogs', newEnabled);
      
      // モニターの状態を更新
      monitor.setEnabled(newEnabled);
      
      const status = newEnabled ? '有効化' : '無効化';
      ErrorHandler.showInfo(`パフォーマンス監視を${status}しました`);
    }, 'パフォーマンス監視の切り替えに失敗しました');

    if (!result) {
      // エラーハンドリングは既にErrorHandlerで処理済み
      return;
    }
  }

  /**
   * パフォーマンス監視を有効化
   */
  private async enablePerformanceMonitoring(): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      const { PerformanceMonitor } = await import('../utils/performance-monitor');
      const monitor = PerformanceMonitor.getInstance();
      const currentSettings = ConfigManager.getPerformanceSettings();
      const newEnabled = true;
      await ConfigManager.set('performance.enablePerformanceLogs', newEnabled);
      monitor.setEnabled(newEnabled);
      ErrorHandler.showInfo('パフォーマンス監視を有効化しました');
    }, 'パフォーマンス監視の有効化に失敗しました');

    if (!result) {
      // エラーハンドリングは既にErrorHandlerで処理済み
      return;
    }
  }

  /**
   * サンプルイベントを生成
   */
  private async generateSampleEvents(): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      const { PerformanceMonitor } = await import('../utils/performance-monitor');
      const monitor = PerformanceMonitor.getInstance();
      monitor.generateSampleEvents();
      ErrorHandler.showInfo('サンプルイベントを生成しました');
    }, 'サンプルイベントの生成に失敗しました');

    if (!result) {
      // エラーハンドリングは既にErrorHandlerで処理済み
      return;
    }
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
    const disposable = vscode.commands.registerCommand(command, callback);
    this.context.subscriptions.push(disposable);
  }

  /**
   * 自動プレビュー設定をチェックしてプレビューを開く
   */
  private async openPreviewWithCheck(): Promise<void> {
    const autoPreviewEnabled = ConfigManager.isAutoPreviewEnabled();
    console.log(`[CommandManager] openPreviewコマンド実行時の設定値: autoPreview.enabled = ${autoPreviewEnabled}`);
    
    if (autoPreviewEnabled) {
      console.log('[CommandManager] 自動プレビューが有効なため、プレビューを開きます');
      await this.webViewManager.openPreview();
    } else {
      console.log('[CommandManager] 自動プレビューが無効なため、プレビューを開きません');
      ErrorHandler.showInfo('自動プレビューが無効になっているため、プレビューを開くことができません。設定で有効にしてください。');
    }
  }
} 