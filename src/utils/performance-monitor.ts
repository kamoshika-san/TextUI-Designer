import * as vscode from 'vscode';

/**
 * パフォーマンス監視ユーティリティ
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private timers: Map<string, number> = new Map();
  private isEnabled: boolean = false;
  private memoryMonitorInterval?: NodeJS.Timeout;

  private constructor() {
    // ConfigManagerのインポートを遅延実行して循環参照を避ける
    this.isEnabled = false; // 初期化時に設定を読み込む
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    const { ConfigManager } = await import('./config-manager');
    this.isEnabled = ConfigManager.getPerformanceSettings().enablePerformanceLogs;
  }

  /**
   * パフォーマンス測定を開始
   */
  startTimer(name: string): void {
    if (!this.isEnabled) return;
    this.timers.set(name, Date.now());
  }

  /**
   * パフォーマンス測定を終了
   */
  endTimer(name: string): number {
    if (!this.isEnabled) return 0;
    
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`[PerformanceMonitor] タイマー "${name}" が見つかりません`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(name);

    // メトリクスを記録
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);

    // ログ出力
    console.log(`[PerformanceMonitor] ${name}: ${duration}ms`);
    return duration;
  }

  /**
   * メトリクスを記録
   */
  recordMetric(name: string, value: number): void {
    if (!this.isEnabled) return;
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  /**
   * メトリクスの統計を取得
   */
  getMetrics(name: string): { count: number; avg: number; min: number; max: number; total: number } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    const count = values.length;
    const total = values.reduce((sum, val) => sum + val, 0);
    const avg = total / count;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { count, avg, min, max, total };
  }

  /**
   * すべてのメトリクスを取得
   */
  getAllMetrics(): Record<string, { count: number; avg: number; min: number; max: number; total: number }> {
    const result: Record<string, { count: number; avg: number; min: number; max: number; total: number }> = {};
    
    for (const [name] of this.metrics) {
      const stats = this.getMetrics(name);
      if (stats) {
        result[name] = stats;
      }
    }

    return result;
  }

  /**
   * メトリクスをクリア
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.timers.clear();
  }

  /**
   * メモリ使用量の監視を開始
   */
  async startMemoryMonitoring(): Promise<void> {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }

    const { ConfigManager } = await import('./config-manager');
    const interval = ConfigManager.getPerformanceSettings().memoryMonitorInterval;
    
    this.memoryMonitorInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      this.recordMetric('memory.rss', memUsage.rss);
      this.recordMetric('memory.heapUsed', memUsage.heapUsed);
      this.recordMetric('memory.heapTotal', memUsage.heapTotal);

      if (this.isEnabled) {
        console.log(`[PerformanceMonitor] メモリ使用量:`, {
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
        });
      }
    }, interval);
  }

  /**
   * メモリ使用量の監視を停止
   */
  stopMemoryMonitoring(): void {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = undefined;
    }
  }

  /**
   * パフォーマンスレポートを生成
   */
  generateReport(): string {
    const metrics = this.getAllMetrics();
    let report = '📊 TextUI Designer パフォーマンスレポート\n';
    report += '='.repeat(50) + '\n\n';

    for (const [name, stats] of Object.entries(metrics)) {
      report += `${name}:\n`;
      report += `  実行回数: ${stats.count}\n`;
      report += `  平均時間: ${stats.avg.toFixed(2)}ms\n`;
      report += `  最小時間: ${stats.min}ms\n`;
      report += `  最大時間: ${stats.max}ms\n`;
      report += `  合計時間: ${stats.total}ms\n\n`;
    }

    return report;
  }

  /**
   * パフォーマンスレポートを表示
   */
  showReport(): void {
    const report = this.generateReport();
    vscode.window.showInformationMessage('パフォーマンスレポートを生成しました');
    
    // 新しいドキュメントでレポートを表示
    vscode.workspace.openTextDocument({
      content: report,
      language: 'markdown'
    }).then(doc => {
      vscode.window.showTextDocument(doc);
    });
  }

  /**
   * 有効化/無効化を切り替え
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stopMemoryMonitoring();
    }
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    this.stopMemoryMonitoring();
    this.clearMetrics();
  }
} 