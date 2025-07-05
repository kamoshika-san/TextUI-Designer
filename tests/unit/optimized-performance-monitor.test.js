const { expect } = require('chai');
const { CircularBuffer } = require('../../out/utils/performance-monitor/circular-buffer');
const { PerformanceMetricsCollector } = require('../../out/utils/performance-monitor/performance-metrics-collector');
const { OptimizedPerformanceMonitor } = require('../../out/utils/performance-monitor/optimized-performance-monitor');

describe('OptimizedPerformanceMonitor', function() {
  let monitor;

  beforeEach(function() {
    monitor = OptimizedPerformanceMonitor.getInstance();
    monitor.clear();
    monitor.forceEnable();
  });

  describe('CircularBuffer', function() {
    it('O(1)で統計計算ができる', function() {
      const buffer = new CircularBuffer(5, (value) => value);
      
      // データを追加
      buffer.push(10);
      buffer.push(20);
      buffer.push(30);
      
      // O(1)で統計計算
      expect(buffer.getAverage()).to.equal(20);
      expect(buffer.getSum()).to.equal(60);
      expect(buffer.getCount()).to.equal(3);
    });

    it('バッファーが満杯になると古いデータが削除される', function() {
      const buffer = new CircularBuffer(3, (value) => value);
      
      // 容量を超えてデータを追加
      buffer.push(10);
      buffer.push(20);
      buffer.push(30);
      buffer.push(40); // 10が削除される
      
      expect(buffer.getAverage()).to.equal(30); // (20+30+40)/3
      expect(buffer.getCount()).to.equal(3);
    });

    it('最新のN個の要素を取得できる', function() {
      const buffer = new CircularBuffer(5, (value) => value);
      
      buffer.push(10);
      buffer.push(20);
      buffer.push(30);
      
      const latest = buffer.getLatestN(2);
      expect(latest).to.deep.equal([30, 20]); // 最新から古い順
    });
  });

  describe('PerformanceMetricsCollector', function() {
    it('カテゴリ別の統計を効率的に管理できる', function() {
      const collector = new PerformanceMetricsCollector();
      
      // レンダリングイベントを記録
      collector.recordRenderEvent(100, { component: 'Button' });
      collector.recordRenderEvent(200, { component: 'Form' });
      
      // キャッシュヒットを記録
      collector.recordCacheHit(true);
      collector.recordCacheHit(false);
      collector.recordCacheHit(true);
      
      // 統計を取得
      const renderStats = collector.getRenderStats();
      expect(renderStats.average).to.equal(150);
      expect(renderStats.count).to.equal(2);
      
      const cacheHitRate = collector.getCacheHitRate();
      expect(cacheHitRate).to.equal(2 / 3 * 100); // 66.67%
    });

    it('メモリ使用量を定期的に更新する', function() {
      const collector = new PerformanceMetricsCollector();
      
      // 最初の取得
      const metrics1 = collector.getMetrics();
      expect(metrics1.memoryUsage).to.be.a('number');
      
      // 再度取得（キャッシュされた値が返される）
      const metrics2 = collector.getMetrics();
      expect(metrics2.memoryUsage).to.equal(metrics1.memoryUsage);
    });

    it('詳細な統計情報を提供する', function() {
      const collector = new PerformanceMetricsCollector();
      
      collector.recordRenderEvent(100);
      collector.recordRenderEvent(200);
      collector.recordExportEvent(500);
      collector.recordCacheHit(true);
      collector.recordDiffEfficiency(2, 10);
      
      const detailedStats = collector.getDetailedStats();
      
      expect(detailedStats.render.average).to.equal(150);
      expect(detailedStats.export.average).to.equal(500);
      expect(detailedStats.cache.hitRate).to.equal(100);
      expect(detailedStats.diff.efficiency).to.equal(80);
      expect(detailedStats.operations.total).to.equal(5);
    });
  });

  describe('OptimizedPerformanceMonitor', function() {
    it('従来のAPIとの互換性を保持する', function() {
      // 従来のAPIでデータを記録
      monitor.recordEvent('render', 100, { component: 'Button' });
      monitor.recordCacheHit(true);
      monitor.recordDiffEfficiency(1, 10);
      
      // 統計を取得
      const metrics = monitor.getMetrics();
      expect(metrics.renderTime).to.equal(100);
      expect(metrics.cacheHitRate).to.equal(100);
      expect(metrics.diffEfficiency).to.equal(90);
    });

    it('測定メソッドが正常に動作する', async function() {
      // レンダリング時間を測定
      const result = await monitor.measureRenderTime(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'test result';
      });
      
      expect(result).to.equal('test result');
      
      const renderStats = monitor.getRenderStats();
      expect(renderStats.count).to.equal(1);
      expect(renderStats.average).to.be.at.least(45); // 50ms前後
    });

    it('エラーケースでも正しく記録される', async function() {
      try {
        await monitor.measureRenderTime(async () => {
          await new Promise(resolve => setTimeout(resolve, 30));
          throw new Error('Test error');
        });
      } catch (error) {
        expect(error.message).to.equal('Test error');
      }
      
      const renderStats = monitor.getRenderStats();
      expect(renderStats.count).to.equal(1);
      expect(renderStats.average).to.be.at.least(25); // 30ms前後
    });

    it('バッファーサイズを動的に調整できる', function() {
      // 複数のイベントを記録
      for (let i = 0; i < 10; i++) {
        monitor.recordEvent('render', i * 10);
      }
      
      let renderStats = monitor.getRenderStats();
      expect(renderStats.count).to.equal(10);
      
      // バッファーサイズを小さくする
      monitor.adjustBufferSize(5);
      
      renderStats = monitor.getRenderStats();
      expect(renderStats.count).to.equal(5); // 最新の5個だけ保持
    });

    it('パフォーマンスレポートを生成する', function() {
      // テストデータを生成
      monitor.generateSampleEvents();
      
      const report = monitor.generateReport();
      
      expect(report).to.include('最適化されたパフォーマンスレポート');
      expect(report).to.include('主要メトリクス（O(1)取得）');
      expect(report).to.include('CircularBufferによるO(1)統計計算');
      expect(report).to.include('線形検索の完全排除');
    });

    it('メモリ管理とクリーンアップが正常に動作する', function() {
      // データを記録
      monitor.recordEvent('render', 100);
      monitor.recordCacheHit(true);
      
      let metrics = monitor.getMetrics();
      expect(metrics.totalOperations).to.be.greaterThan(0);
      
      // クリア
      monitor.clear();
      
      metrics = monitor.getMetrics();
      expect(metrics.totalOperations).to.equal(0);
      expect(metrics.renderTime).to.equal(0);
      expect(metrics.cacheHitRate).to.equal(0);
    });
  });

  describe('パフォーマンスの改善点', function() {
    it('線形検索を排除している', function() {
      const collector = new PerformanceMetricsCollector();
      
      // 大量のデータを追加
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        collector.recordRenderEvent(i, { iteration: i });
      }
      
      // 統計計算（O(1)）
      const renderStats = collector.getRenderStats();
      const end = performance.now();
      
      // 統計計算が非常に高速であることを確認
      expect(end - start).to.be.lessThan(50); // 50ms以内
      expect(renderStats.count).to.equal(1000);
    });

    it('メモリ使用量の最適化', function() {
      const collector = new PerformanceMetricsCollector(100); // 小さいバッファ
      
      // 大量のデータを追加（バッファサイズを超える）
      for (let i = 0; i < 200; i++) {
        collector.recordRenderEvent(i);
      }
      
      // バッファサイズを超えても正常に動作
      const stats = collector.getRenderStats();
      expect(stats.count).to.equal(100); // バッファサイズまでしか保持されない
      expect(stats.average).to.be.a('number');
    });

    it('カテゴリ別の効率的な統計管理', function() {
      const collector = new PerformanceMetricsCollector();
      
      // 各カテゴリにデータを追加
      collector.recordRenderEvent(100);
      collector.recordRenderEvent(200);
      collector.recordExportEvent(500);
      collector.recordExportEvent(600);
      collector.recordCacheHit(true);
      collector.recordCacheHit(false);
      
      // 各カテゴリの統計を個別に取得
      const renderStats = collector.getRenderStats();
      const exportStats = collector.getExportStats();
      const cacheRate = collector.getCacheHitRate();
      
      expect(renderStats.average).to.equal(150);
      expect(renderStats.count).to.equal(2);
      expect(exportStats.average).to.equal(550);
      expect(exportStats.count).to.equal(2);
      expect(cacheRate).to.equal(50);
    });
  });
}); 