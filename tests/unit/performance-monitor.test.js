/**
 * PerformanceMonitorの基本テスト
 */

const assert = require('assert');
const { describe, it, beforeEach, afterEach } = require('mocha');

// VSCode APIとConfigManagerのモック
const mockVscode = {
  window: {
    showErrorMessage: () => {},
    showWarningMessage: () => {},
    showInformationMessage: () => {}
  },
  workspace: {
    getConfiguration: () => ({
      get: (key, defaultValue) => {
        // パフォーマンス設定のデフォルト値
        if (key === 'performance.enablePerformanceLogs') return true;
        return defaultValue;
      }
    })
  },
  env: {
    uiKind: 2, // Desktop
    Web: 1     // Web = 1, Desktop = 2
  }
};

global.vscode = mockVscode;

const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'vscode') {
    return mockVscode;
  }
  return originalRequire.apply(this, arguments);
};

function freshRequirePerformanceMonitor() {
  // requireキャッシュをクリアして毎回新しいモジュールを取得
  delete require.cache[require.resolve('../../dist/utils/performance-monitor.js')];
  return require('../../dist/utils/performance-monitor.js').PerformanceMonitor;
}

describe('PerformanceMonitor', () => {
  let monitor;

  beforeEach(() => {
    // requireキャッシュをクリアしてから毎回新しいモジュールを取得
    const PerformanceMonitor = freshRequirePerformanceMonitor();
    monitor = PerformanceMonitor.getInstance();
    monitor.clear();
    // isDevelopmentModeを常にfalseに
    monitor.isDevelopmentMode = () => false;
  });

  afterEach(() => {
    if (monitor && typeof monitor.dispose === 'function') {
      monitor.dispose();
    }
  });

  it('measureRenderTimeで経過時間が記録される', async () => {
    const result = await monitor.measureRenderTime(async () => {
      // 50ms待つ
      await new Promise(res => setTimeout(res, 50));
      return 'done';
    });
    assert.strictEqual(result, 'done');
    const metrics = monitor.getMetrics();
    // 平均レンダリング時間が0より大きい
    assert.ok(metrics.renderTime > 0, 'renderTimeが記録されている');
  });

  it('disposeで監視タイマーが停止できる', () => {
    assert.ok(monitor);
    monitor.dispose();
    monitor.dispose();
  });

  it('recordCacheHitでヒット率が記録される', () => {
    monitor.recordCacheHit(true);
    monitor.recordCacheHit(false);
    const metrics = monitor.getMetrics();
    assert.ok(metrics.cacheHitRate >= 0 && metrics.cacheHitRate <= 100);
  });
}); 