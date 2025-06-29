/**
 * テスト専用PerformanceMonitorファクトリ
 */

class TestPerformanceMonitor {
  constructor(mockVscode) {
    this.vscode = mockVscode;
    this.metrics = new Map();
    this.timers = new Map();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.outputChannel = mockVscode.window.createOutputChannel('TextUI Designer Performance');
    this.disposed = false;
  }

  /**
   * パフォーマンス測定を開始
   */
  static startTimer(name) {
    const instance = TestPerformanceMonitor._getInstance();
    const startTime = Date.now();
    instance.timers.set(name, startTime);
    instance.outputChannel.appendLine(`[PERF] Timer started: ${name}`);
    return startTime;
  }

  /**
   * パフォーマンス測定を終了
   */
  static endTimer(name) {
    const instance = TestPerformanceMonitor._getInstance();
    const startTime = instance.timers.get(name);
    
    if (!startTime) {
      instance.outputChannel.appendLine(`[PERF] Warning: Timer '${name}' was not started`);
      return 0;
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    instance.timers.delete(name);
    instance.metrics.set(name, duration);
    instance.outputChannel.appendLine(`[PERF] Timer ended: ${name} (${duration}ms)`);
    
    return duration;
  }

  /**
   * レンダリング時間を測定
   */
  static measureRenderTime(renderFunction) {
    const instance = TestPerformanceMonitor._getInstance();
    const startTime = Date.now();
    
    try {
      const result = renderFunction();
      const duration = Date.now() - startTime;
      
      instance.metrics.set('renderTime', duration);
      instance.outputChannel.appendLine(`[PERF] Render time: ${duration}ms`);
      
      return { result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      instance.outputChannel.appendLine(`[PERF] Render failed after: ${duration}ms`);
      throw error;
    }
  }

  /**
   * キャッシュヒットを記録
   */
  static recordCacheHit() {
    const instance = TestPerformanceMonitor._getInstance();
    instance.cacheHits++;
    instance.outputChannel.appendLine(`[PERF] Cache hit recorded. Total hits: ${instance.cacheHits}`);
  }

  /**
   * キャッシュミスを記録
   */
  static recordCacheMiss() {
    const instance = TestPerformanceMonitor._getInstance();
    instance.cacheMisses++;
    instance.outputChannel.appendLine(`[PERF] Cache miss recorded. Total misses: ${instance.cacheMisses}`);
  }

  /**
   * キャッシュヒット率を取得
   */
  static getCacheHitRate() {
    const instance = TestPerformanceMonitor._getInstance();
    const total = instance.cacheHits + instance.cacheMisses;
    return total > 0 ? instance.cacheHits / total : 0;
  }

  /**
   * リソースを解放
   */
  static dispose() {
    const instance = TestPerformanceMonitor._getInstance();
    instance.disposed = true;
    instance.metrics.clear();
    instance.timers.clear();
    instance.cacheHits = 0;
    instance.cacheMisses = 0;
    instance.outputChannel.appendLine(`[PERF] Performance monitor disposed`);
  }

  /**
   * メトリクスを記録
   */
  static recordMetric(name, value, unit = 'ms') {
    const instance = TestPerformanceMonitor._getInstance();
    const metric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString()
    };
    
    instance.metrics.set(name, metric);
    instance.outputChannel.appendLine(`[PERF] Metric recorded: ${name} = ${value}${unit}`);
    
    return metric;
  }

  /**
   * メモリ使用量を記録
   */
  static recordMemoryUsage(context = '') {
    const instance = TestPerformanceMonitor._getInstance();
    
    // Node.js環境でのメモリ使用量を取得
    const memUsage = process.memoryUsage();
    const metric = {
      context,
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      timestamp: new Date().toISOString()
    };
    
    instance.metrics.set(`memory_${context}`, metric);
    instance.outputChannel.appendLine(`[PERF] Memory usage (${context}): ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    
    return metric;
  }

  /**
   * パフォーマンス関数を測定
   */
  static async measureFunction(name, fn) {
    TestPerformanceMonitor.startTimer(name);
    try {
      const result = await fn();
      TestPerformanceMonitor.endTimer(name);
      return result;
    } catch (error) {
      TestPerformanceMonitor.endTimer(name);
      throw error;
    }
  }

  /**
   * すべてのメトリクスを取得
   */
  static getMetrics() {
    const instance = TestPerformanceMonitor._getInstance();
    return Object.fromEntries(instance.metrics);
  }

  /**
   * 特定のメトリクスを取得
   */
  static getMetric(name) {
    const instance = TestPerformanceMonitor._getInstance();
    return instance.metrics.get(name);
  }

  /**
   * メトリクスをクリア
   */
  static clearMetrics() {
    const instance = TestPerformanceMonitor._getInstance();
    instance.metrics.clear();
    instance.timers.clear();
    instance.cacheHits = 0;
    instance.cacheMisses = 0;
    instance.outputChannel.clear();
  }

  /**
   * パフォーマンスレポートを生成
   */
  static generateReport() {
    const instance = TestPerformanceMonitor._getInstance();
    const metrics = TestPerformanceMonitor.getMetrics();
    
    const report = {
      timestamp: new Date().toISOString(),
      totalMetrics: Object.keys(metrics).length,
      cacheHitRate: TestPerformanceMonitor.getCacheHitRate(),
      metrics
    };
    
    instance.outputChannel.appendLine(`[PERF] Report generated: ${report.totalMetrics} metrics`);
    
    return report;
  }

  /**
   * シングルトンインスタンスを取得
   */
  static _getInstance() {
    if (!TestPerformanceMonitor._instance) {
      const mockVscode = require('./vscode-mock');
      TestPerformanceMonitor._instance = new TestPerformanceMonitor(mockVscode);
    }
    return TestPerformanceMonitor._instance;
  }

  /**
   * インスタンスをリセット
   */
  static reset() {
    TestPerformanceMonitor._instance = null;
  }

  /**
   * テスト用にインスタンスを設定
   */
  static _setInstance(instance) {
    TestPerformanceMonitor._instance = instance;
  }
}

TestPerformanceMonitor._instance = null;

/**
 * PerformanceMonitorファクトリ
 */
class PerformanceMonitorFactory {
  /**
   * テスト用PerformanceMonitorを作成
   */
  static createForTest(mockVscode) {
    const instance = new TestPerformanceMonitor(mockVscode);
    TestPerformanceMonitor._setInstance(instance);
    return TestPerformanceMonitor;
  }

  /**
   * 本番用PerformanceMonitorを取得
   */
  static createForProduction() {
    try {
      return require('../../out/utils/performance-monitor.js').PerformanceMonitor;
    } catch (error) {
      return TestPerformanceMonitor;
    }
  }

  /**
   * 環境に応じたPerformanceMonitorを取得
   */
  static create() {
    if (process.env.NODE_ENV === 'test') {
      const mockVscode = require('./vscode-mock');
      return PerformanceMonitorFactory.createForTest(mockVscode);
    } else {
      return PerformanceMonitorFactory.createForProduction();
    }
  }
}

module.exports = {
  TestPerformanceMonitor,
  PerformanceMonitorFactory
}; 