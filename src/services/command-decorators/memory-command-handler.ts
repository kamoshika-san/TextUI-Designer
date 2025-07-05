import * as vscode from 'vscode';
import { SafeCommand } from './safe-command-decorator';
import { ConfigManager } from '../../utils/config-manager';
import { TextUIMemoryTracker } from '../../utils/textui-memory-tracker';

/**
 * メモリ追跡関連のコマンドハンドラー
 */
export class MemoryCommandHandler {

  /**
   * メモリレポートを表示
   */
  @SafeCommand({
    errorMessage: 'メモリレポートの表示に失敗しました',
    successMessage: 'メモリレポートを表示しました'
  })
  async showMemoryReport(): Promise<void> {
    const memoryTracker = TextUIMemoryTracker.getInstance();
    const report = memoryTracker.generateMemoryReport();
    
    // 新しいドキュメントでレポートを表示
    const doc = await vscode.workspace.openTextDocument({
      content: report,
      language: 'markdown'
    });
    await vscode.window.showTextDocument(doc);
  }

  /**
   * メモリ追跡の有効化/無効化を切り替え
   */
  @SafeCommand({
    errorMessage: 'メモリ追跡の切り替えに失敗しました'
  })
  async toggleMemoryTracking(): Promise<void> {
    const memoryTracker = TextUIMemoryTracker.getInstance();
    
    // 現在の状態を確認
    const currentSettings = ConfigManager.getPerformanceSettings();
    const newEnabled = !currentSettings.enableMemoryTracking;
    
    // 設定を更新
    await ConfigManager.set('performance.enableMemoryTracking', newEnabled);
    
    // メモリトラッカーの状態を更新
    memoryTracker.setEnabled(newEnabled);
    
    const status = newEnabled ? '有効化' : '無効化';
    vscode.window.showInformationMessage(`メモリ追跡を${status}しました`);
  }

  /**
   * メモリ追跡を有効化
   */
  @SafeCommand({
    errorMessage: 'メモリ追跡の有効化に失敗しました',
    successMessage: 'メモリ追跡を有効化しました'
  })
  async enableMemoryTracking(): Promise<void> {
    const memoryTracker = TextUIMemoryTracker.getInstance();
    
    // 設定を更新
    await ConfigManager.set('performance.enableMemoryTracking', true);
    
    // メモリトラッカーを有効化
    memoryTracker.setEnabled(true);
  }
} 