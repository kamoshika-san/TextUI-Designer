/**
 * テスト専用PerformanceMonitorファクトリ
 */

class TestPerformanceMonitor {
  constructor() {
    this.outputChannel = (global.vscode && global.vscode.window && global.vscode.window.createOutputChannel)
      ? global.vscode.window.createOutputChannel('TextUI Designer')
      : {
          appendLine: () => {},
          show: () => {},
          clear: () => {}
        };
    this.metrics = new Map();
    this.timers = new Map();
    this.cacheHits = 0;
    this.cacheMisses = 0;
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
      TestPerformanceMonitor._instance = new TestPerformanceMonitor();
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

  /**
   * テスト用: メトリクスを直接設定する
   */
  static _setTestMetrics(metrics) {
    const instance = TestPerformanceMonitor._getInstance();
    // テスト用メトリクスを内部ストレージに保存
    instance._testMetrics = { ...metrics };
    instance.outputChannel.appendLine(`[PERF] Test metrics set: ${JSON.stringify(metrics)}`);
  }

  /**
   * テスト用: 推奨事項を取得する
   */
  static _getRecommendations(metrics) {
    const instance = TestPerformanceMonitor._getInstance();
    const metricsToUse = metrics || instance._testMetrics || {
      renderTime: 0,
      cacheHitRate: 0,
      diffEfficiency: 0,
      memoryUsage: 0,
      totalOperations: 0
    };

    const recommendations = [];

    if (metricsToUse.renderTime > 100) {
      recommendations.push('- レンダリング時間が長いため、コンポーネントの最適化を検討してください');
    }

    if (metricsToUse.cacheHitRate < 50) {
      recommendations.push('- キャッシュヒット率が低いため、キャッシュ戦略の見直しを検討してください');
    }

    if (metricsToUse.diffEfficiency < 80) {
      recommendations.push('- 差分更新効率が低いため、コンポーネントの変更頻度を確認してください');
    }

    if (metricsToUse.memoryUsage > 150) {
      recommendations.push('- メモリ使用量が多いため、不要なオブジェクトの解放を検討してください');
    } else if (metricsToUse.memoryUsage > 100) {
      recommendations.push('- メモリ使用量がやや多めです。大きなファイルを扱う場合は注意してください');
    }

    const result = recommendations.length > 0 ? recommendations.join('\n') : '- 現在のパフォーマンスは良好です';
    instance.outputChannel.appendLine(`[PERF] Recommendations generated: ${result}`);
    
    return result;
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