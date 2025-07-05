const { expect } = require('chai');
const { MemoryCategory } = require('../../out/utils/memory-tracker/memory-category');
const { OptimizedMemoryTracker } = require('../../out/utils/memory-tracker/optimized-memory-tracker');

describe('OptimizedMemoryTracker', function() {
  let tracker;

  beforeEach(function() {
    tracker = OptimizedMemoryTracker.getInstance();
    // テスト用に有効化
    tracker.setEnabled(true);
    // 既存のデータをクリア
    tracker.dispose();
    tracker = OptimizedMemoryTracker.getInstance();
    tracker.setEnabled(true);
  });

  describe('MemoryCategory', function() {
    it('O(1)でオブジェクト追跡ができる', function() {
      const category = new MemoryCategory('webview');
      
      // オブジェクトを追加
      category.trackObject('obj1', 1024);
      category.trackObject('obj2', 2048);
      
      // O(1)で統計取得
      const stats = category.getStats();
      expect(stats.totalSize).to.equal(3072);
      expect(stats.objectCount).to.equal(2);
      expect(stats.averageSize).to.equal(1536);
    });

    it('オブジェクトの削除ができる', function() {
      const category = new MemoryCategory('yaml-cache');
      
      category.trackObject('obj1', 1024);
      category.trackObject('obj2', 2048);
      
      expect(category.untrackObject('obj1')).to.be.true;
      expect(category.untrackObject('obj1')).to.be.false; // 既に削除済み
      
      const stats = category.getStats();
      expect(stats.objectCount).to.equal(1);
      expect(stats.totalSize).to.equal(2048);
    });

    it('メモリ使用量をMB単位で取得できる', function() {
      const category = new MemoryCategory('diagnostics');
      
      // 1MB = 1024 * 1024 バイト
      category.trackObject('obj1', 1024 * 1024);
      
      expect(category.getMemoryUsageMB()).to.equal(1);
    });

    it('制限チェックができる', function() {
      const category = new MemoryCategory('render-cache');
      
      // 1000個のオブジェクトを追加
      for (let i = 0; i < 1000; i++) {
        category.trackObject(`obj${i}`, 1024);
      }
      
      expect(category.isAtCapacity(1000)).to.be.true;
      expect(category.isAtCapacity(1001)).to.be.false;
    });
  });

  describe('OptimizedMemoryTracker', function() {
    it('オブジェクトを追跡できる', function() {
      tracker.trackObject('webview', 'webview1', 1024 * 1024); // 1MB
      tracker.trackObject('yaml-cache', 'yaml1', 512 * 1024); // 0.5MB
      
      const metrics = tracker.getMetrics();
      expect(metrics.webviewMemory).to.equal(1);
      expect(metrics.yamlCacheMemory).to.equal(0.5);
      expect(metrics.totalTrackedMemory).to.equal(1.5);
    });

    it('オブジェクトを削除できる', function() {
      tracker.trackObject('diagnostics', 'diag1', 1024);
      
      expect(tracker.untrackObject('diagnostics', 'diag1')).to.be.true;
      expect(tracker.untrackObject('diagnostics', 'diag1')).to.be.false;
    });

    it('メモリレポートを生成できる', function() {
      tracker.trackObject('webview', 'webview1', 1024 * 1024);
      tracker.trackObject('render-cache', 'render1', 2048 * 1024);
      
      const report = tracker.generateMemoryReport();
      
      expect(report.metrics.totalTrackedMemory).to.equal(3);
      expect(report.details.webview.objectCount).to.equal(1);
      expect(report.details.webview.totalSizeMB).to.equal(1);
      expect(report.recommendations).to.be.an('array');
    });

    it('測定オーバーヘッドが低い', function() {
      // 大量のオブジェクトを追加
      for (let i = 0; i < 100; i++) {
        tracker.trackObject('webview', `webview${i}`, 1024);
        tracker.trackObject('yaml-cache', `yaml${i}`, 512);
      }
      
      const startTime = performance.now();
      const metrics = tracker.getMetrics();
      const endTime = performance.now();
      
      const overhead = endTime - startTime;
      expect(overhead).to.be.lessThan(1); // 1ms未満
      expect(metrics.measurementOverhead).to.be.a('number');
    });

    it('無効なカテゴリを処理できる', function() {
      // 無効なカテゴリでオブジェクトを追跡しようとする
      tracker.trackObject('invalid-category', 'obj1', 1024);
      
      const metrics = tracker.getMetrics();
      expect(metrics.totalTrackedMemory).to.equal(0);
    });

    it('設定の有効/無効ができる', function() {
      tracker.setEnabled(false);
      tracker.trackObject('webview', 'obj1', 1024);
      
      const metrics = tracker.getMetrics();
      expect(metrics.totalTrackedMemory).to.equal(0);
      
      tracker.setEnabled(true);
      tracker.trackObject('webview', 'obj2', 1024);
      
      const metrics2 = tracker.getMetrics();
      expect(metrics2.totalTrackedMemory).to.be.greaterThan(0);
    });
  });

  describe('パフォーマンス', function() {
    it('大量のオブジェクトでも高速に動作する', function() {
      const startTime = performance.now();
      
      // 1000個のオブジェクトを追加
      for (let i = 0; i < 1000; i++) {
        tracker.trackObject('webview', `webview${i}`, 1024);
      }
      
      const addTime = performance.now() - startTime;
      expect(addTime).to.be.lessThan(100); // 100ms未満
      
      // メトリクス取得も高速
      const metricsStartTime = performance.now();
      const metrics = tracker.getMetrics();
      const metricsTime = performance.now() - metricsStartTime;
      
      expect(metricsTime).to.be.lessThan(1); // 1ms未満
      expect(metrics.webviewMemory).to.be.greaterThan(0);
    });
  });
}); 