/**
 * PerformanceMonitorの基本テスト
 */

const assert = require('assert');
const path = require('path');
const { describe, it, beforeEach, afterEach } = require('mocha');

describe('PerformanceMonitor', function() {
  let PerformanceMonitor;

  beforeEach(function() {
    // モックをクリーンアップ（ファクトリをグローバルに再設定）
    global.cleanupMocks();
    
    if (!global.PerformanceMonitorFactory || typeof global.PerformanceMonitorFactory.createForTest !== 'function') {
      throw new Error('Global PerformanceMonitorFactory or createForTest method is not available');
    }
    
    // テスト用のPerformanceMonitorを作成
    PerformanceMonitor = global.PerformanceMonitorFactory.createForTest(global.vscode);
  });

  afterEach(function() {
    // テスト後のクリーンアップ
    global.cleanupMocks();
  });

  it('measureRenderTimeで経過時間が記録される', function() {
    const result = PerformanceMonitor.measureRenderTime(() => {
      // 何らかの処理をシミュレート
      return 'done';
    });
    
    assert.strictEqual(result.result, 'done');
    assert.ok(result.duration >= 0, 'レンダリング時間が記録されている');
    
    // メトリクスが記録されている
    const metrics = PerformanceMonitor.getMetrics();
    assert.ok(metrics.renderTime >= 0, 'renderTimeメトリクスが記録されている');
  });

  it('disposeで監視タイマーが停止できる', function() {
    // disposeメソッドが正常に実行される
    PerformanceMonitor.dispose();
    
    // 再度disposeしてもエラーにならない
    PerformanceMonitor.dispose();
    
    assert.ok(true, 'disposeメソッドが正常に実行される');
  });

  it('recordCacheHitでヒット率が記録される', function() {
    // キャッシュヒットとミスを記録
    PerformanceMonitor.recordCacheHit();
    PerformanceMonitor.recordCacheHit();
    PerformanceMonitor.recordCacheMiss();
    
    // ヒット率を取得
    const hitRate = PerformanceMonitor.getCacheHitRate();
    assert.ok(hitRate >= 0 && hitRate <= 1, 'ヒット率が0-1の範囲内');
    assert.strictEqual(hitRate, 2/3, 'ヒット率が正しく計算されている');
  });

  it('タイマー機能が正しく動作する', function() {
    const timerName = 'test-timer';
    
    // タイマー開始
    const startTime = PerformanceMonitor.startTimer(timerName);
    assert.ok(startTime > 0, 'タイマーが開始される');
    
    // 少し待つ
    const now = Date.now();
    while (Date.now() - now < 10) {
      // 10ms待つ
    }
    
    // タイマー終了
    const duration = PerformanceMonitor.endTimer(timerName);
    assert.ok(duration >= 0, 'タイマーの経過時間が記録される');
    
    // メトリクスが記録されている
    const metrics = PerformanceMonitor.getMetrics();
    assert.ok(metrics[timerName] >= 0, 'タイマーメトリクスが記録されている');
  });

  it('メトリクスの記録と取得が正しく動作する', function() {
    const metricName = 'test-metric';
    const metricValue = 42;
    const metricUnit = 'count';
    
    // メトリクスを記録
    const metric = PerformanceMonitor.recordMetric(metricName, metricValue, metricUnit);
    assert.strictEqual(metric.name, metricName);
    assert.strictEqual(metric.value, metricValue);
    assert.strictEqual(metric.unit, metricUnit);
    
    // メトリクスを取得
    const retrievedMetric = PerformanceMonitor.getMetric(metricName);
    assert.ok(retrievedMetric, 'メトリクスが取得できる');
    assert.strictEqual(retrievedMetric.value, metricValue);
    
    // 全メトリクスを取得
    const allMetrics = PerformanceMonitor.getMetrics();
    assert.ok(allMetrics[metricName], '全メトリクスに含まれている');
  });

  it('メモリ使用量の記録が正しく動作する', function() {
    const context = 'test-context';
    
    // メモリ使用量を記録
    const memoryMetric = PerformanceMonitor.recordMemoryUsage(context);
    assert.ok(memoryMetric, 'メモリメトリクスが記録される');
    assert.strictEqual(memoryMetric.context, context);
    assert.ok(memoryMetric.heapUsed > 0, 'ヒープ使用量が記録される');
    
    // メトリクスが記録されている
    const metrics = PerformanceMonitor.getMetrics();
    assert.ok(metrics[`memory_${context}`], 'メモリメトリクスが記録されている');
  });

  it('パフォーマンスレポートが正しく生成される', function() {
    // いくつかのメトリクスを記録
    PerformanceMonitor.recordMetric('test1', 10);
    PerformanceMonitor.recordMetric('test2', 20);
    PerformanceMonitor.recordCacheHit();
    
    // レポートを生成
    const report = PerformanceMonitor.generateReport();
    assert.ok(report, 'レポートが生成される');
    assert.ok(report.timestamp, 'タイムスタンプが含まれている');
    assert.ok(report.totalMetrics >= 2, 'メトリクス数が正しい');
    assert.ok(report.cacheHitRate >= 0, 'キャッシュヒット率が含まれている');
    assert.ok(report.metrics, 'メトリクスデータが含まれている');
  });

  it('メトリクスのクリアが正しく動作する', function() {
    // メトリクスを記録
    PerformanceMonitor.recordMetric('test', 100);
    PerformanceMonitor.recordCacheHit();
    
    // メトリクスが記録されていることを確認
    let metrics = PerformanceMonitor.getMetrics();
    assert.ok(Object.keys(metrics).length > 0, 'メトリクスが記録されている');
    
    // メトリクスをクリア
    PerformanceMonitor.clearMetrics();
    
    // メトリクスがクリアされていることを確認
    metrics = PerformanceMonitor.getMetrics();
    assert.strictEqual(Object.keys(metrics).length, 0, 'メトリクスがクリアされている');
    
    // キャッシュヒット率もリセットされている
    const hitRate = PerformanceMonitor.getCacheHitRate();
    assert.strictEqual(hitRate, 0, 'キャッシュヒット率がリセットされている');
  });

  describe('メモリ制限値のテスト', function() {
    it('メモリ使用量が100MB以下では良好メッセージが表示される', function() {
      // 100MB以下のメモリ使用量をシミュレート
      const mockMetrics = {
        renderTime: 50,
        cacheHitRate: 80,
        diffEfficiency: 90,
        memoryUsage: 80, // 80MB (100MB以下)
        totalOperations: 10
      };
      
      // メトリクスを設定
      PerformanceMonitor._setTestMetrics(mockMetrics);
      
      // 推奨事項を取得
      const recommendations = PerformanceMonitor._getRecommendations();
      assert.ok(recommendations, '推奨事項が生成される');
      
      // メモリに関する推奨事項が含まれていないことを確認
      assert.ok(!recommendations.includes('メモリ使用量が多い'), 
        'メモリ使用量が100MB以下では強い警告が表示されない');
      assert.ok(!recommendations.includes('やや多め'), 
        'メモリ使用量が100MB以下では軽い警告が表示されない');
      assert.ok(recommendations.includes('良好'), 
        '100MB以下では良好メッセージが表示される');
    });

    it('メモリ使用量が100-150MBの範囲では軽い推奨事項が表示される', function() {
      // 100-150MBの範囲のメモリ使用量をシミュレート
      const mockMetrics = {
        renderTime: 50,
        cacheHitRate: 80,
        diffEfficiency: 90,
        memoryUsage: 130, // 130MB
        totalOperations: 10
      };
      
      // メトリクスを設定
      PerformanceMonitor._setTestMetrics(mockMetrics);
      
      // 推奨事項を取得
      const recommendations = PerformanceMonitor._getRecommendations();
      assert.ok(recommendations, '推奨事項が生成される');
      
      // 軽い推奨事項が含まれていることを確認
      assert.ok(recommendations.includes('やや多め'), 
        '100-150MBの範囲では軽い推奨事項が表示される');
      
      // 強い警告は表示されないことを確認
      assert.ok(!recommendations.includes('不要なオブジェクトの解放'), 
        '100-150MBの範囲では強い警告は表示されない');
      
      // 良好メッセージは表示されないことを確認
      assert.ok(!recommendations.includes('良好'), 
        '100-150MBの範囲では良好メッセージは表示されない');
    });

    it('メモリ使用量が150MB以上では強い推奨事項が表示される', function() {
      // 150MB以上のメモリ使用量をシミュレート
      const mockMetrics = {
        renderTime: 50,
        cacheHitRate: 80,
        diffEfficiency: 90,
        memoryUsage: 180, // 180MB
        totalOperations: 10
      };
      
      // メトリクスを設定
      PerformanceMonitor._setTestMetrics(mockMetrics);
      
      // 推奨事項を取得
      const recommendations = PerformanceMonitor._getRecommendations();
      assert.ok(recommendations, '推奨事項が生成される');
      
      // 強い推奨事項が含まれていることを確認
      assert.ok(recommendations.includes('不要なオブジェクトの解放'), 
        '150MB以上では強い推奨事項が表示される');
    });
  });
}); 