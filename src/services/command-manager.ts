import * as vscode from 'vscode';
import { WebViewManager } from './webview-manager';
import { ExportService } from './export-service';
import { TemplateService } from './template-service';
import { SettingsService } from './settings-service';
import { SchemaManager } from './schema-manager';
import { ErrorHandler } from '../utils/error-handler';
import { ConfigManager } from '../utils/config-manager';
import { TextUIMemoryTracker } from '../utils/textui-memory-tracker';

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
    this.registerCommand('textui-designer.showPerformanceReport', () => this.showPerformanceReport());
    this.registerCommand('textui-designer.clearPerformanceMetrics', () => this.clearPerformanceMetrics());
    this.registerCommand('textui-designer.togglePerformanceMonitoring', () => this.togglePerformanceMonitoring());
    this.registerCommand('textui-designer.enablePerformanceMonitoring', () => this.enablePerformanceMonitoring());
    this.registerCommand('textui-designer.generateSampleEvents', () => this.generateSampleEvents());
    
    // メモリ追跡関連
    this.registerCommand('textui-designer.showMemoryReport', () => this.showMemoryReport());
    this.registerCommand('textui-designer.toggleMemoryTracking', () => this.toggleMemoryTracking());
    this.registerCommand('textui-designer.enableMemoryTracking', () => this.enableMemoryTracking());
    
    console.log('[CommandManager] コマンド登録完了');
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
   * メモリレポートを表示
   */
  private async showMemoryReport(): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      const memoryTracker = TextUIMemoryTracker.getInstance();
      const report = memoryTracker.generateMemoryReport();
      
      // 新しいドキュメントでレポートを表示
      const doc = await vscode.workspace.openTextDocument({
        content: report,
        language: 'markdown'
      });
      await vscode.window.showTextDocument(doc);
      
      ErrorHandler.showInfo('メモリレポートを表示しました');
    }, 'メモリレポートの表示に失敗しました');

    if (!result) {
      return;
    }
  }

  /**
   * メモリ追跡の有効化/無効化を切り替え
   */
  private async toggleMemoryTracking(): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      const memoryTracker = TextUIMemoryTracker.getInstance();
      
      // 現在の状態を確認
      const currentSettings = ConfigManager.getPerformanceSettings();
      const newEnabled = !currentSettings.enableMemoryTracking;
      
      // 設定を更新
      await ConfigManager.set('performance.enableMemoryTracking', newEnabled);
      
      // メモリトラッカーの状態を更新
      memoryTracker.setEnabled(newEnabled);
      
      const status = newEnabled ? '有効化' : '無効化';
      ErrorHandler.showInfo(`メモリ追跡を${status}しました`);
    }, 'メモリ追跡の切り替えに失敗しました');

    if (!result) {
      return;
    }
  }

  /**
   * メモリ追跡を有効化
   */
  private async enableMemoryTracking(): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      const memoryTracker = TextUIMemoryTracker.getInstance();
      
      // 設定を更新
      await ConfigManager.set('performance.enableMemoryTracking', true);
      
      // メモリトラッカーを有効化
      memoryTracker.setEnabled(true);
      
      ErrorHandler.showInfo('メモリ追跡を有効化しました');
    }, 'メモリ追跡の有効化に失敗しました');

    if (!result) {
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