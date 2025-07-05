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
    const reportContent = this.formatMemoryReport(report);
    const doc = await vscode.workspace.openTextDocument({
      content: reportContent,
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

  /**
   * メモリレポートをMarkdown形式にフォーマット
   */
  private formatMemoryReport(report: any): string {
    const { metrics, recommendations, details }: {
      metrics: any;
      recommendations: string[];
      details: Record<string, { objectCount: number; totalSizeMB: number; averageSizeKB: number }>;
    } = report;
    
    let content = '# TextUI Designer メモリレポート\n\n';
    
    // メトリクス
    content += '## メモリ使用量\n\n';
    content += `- **総メモリ使用量**: ${metrics.totalTrackedMemory.toFixed(2)} MB\n`;
    content += `- **WebView**: ${metrics.webviewMemory.toFixed(2)} MB\n`;
    content += `- **YAMLキャッシュ**: ${metrics.yamlCacheMemory.toFixed(2)} MB\n`;
    content += `- **診断システム**: ${metrics.diagnosticsMemory.toFixed(2)} MB\n`;
    content += `- **レンダリングキャッシュ**: ${metrics.renderCacheMemory.toFixed(2)} MB\n`;
    content += `- **測定オーバーヘッド**: ${metrics.measurementOverhead.toFixed(2)} ms\n\n`;
    
    // 詳細情報
    content += '## 詳細情報\n\n';
    Object.entries(details).forEach(([category, detail]) => {
      content += `### ${category}\n`;
      content += `- オブジェクト数: ${detail.objectCount}\n`;
      content += `- 総サイズ: ${detail.totalSizeMB.toFixed(2)} MB\n`;
      content += `- 平均サイズ: ${detail.averageSizeKB.toFixed(2)} KB\n\n`;
    });
    
    // 推奨事項
    if (recommendations.length > 0) {
      content += '## 推奨事項\n\n';
      recommendations.forEach((rec: string) => {
        content += `- ${rec}\n`;
      });
    }
    
    return content;
  }
} 