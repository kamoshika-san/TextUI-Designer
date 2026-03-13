const assert = require('assert');

const { ConfigManager } = require('../../out/utils/config-manager');
const { TextUIMemoryTracker } = require('../../out/utils/textui-memory-tracker');

describe('TextUIMemoryTracker', function() {
  const ONE_MB = 1024 * 1024;
  const originalGetPerformanceSettings = ConfigManager.getPerformanceSettings;

  beforeEach(function() {
    ConfigManager.getPerformanceSettings = () => ({ enableMemoryTracking: true });
    TextUIMemoryTracker.instance = undefined;
  });

  afterEach(function() {
    const instance = TextUIMemoryTracker.instance;
    if (instance) {
      instance.dispose();
    }

    TextUIMemoryTracker.instance = undefined;
    ConfigManager.getPerformanceSettings = originalGetPerformanceSettings;
  });

  it('同一オブジェクトの再追跡で重複集計しない', async function() {
    const tracker = TextUIMemoryTracker.getInstance();
    const obj = {};

    tracker.trackWebviewObject(obj, ONE_MB, { phase: 1 });
    tracker.trackWebviewObject(obj, ONE_MB * 2, { phase: 2 });

    await tracker._measureMemoryForTest();
    const metrics = tracker.getMetrics();

    assert.strictEqual(metrics.webviewMemory, 2);
    assert.strictEqual(metrics.totalTrackedMemory, 2);
  });

  it('カテゴリ変更時に旧カテゴリの集計から除外する', async function() {
    const tracker = TextUIMemoryTracker.getInstance();
    const obj = {};

    tracker.trackWebviewObject(obj, ONE_MB);
    tracker.trackYamlCacheObject(obj, ONE_MB * 3);

    await tracker._measureMemoryForTest();
    const metrics = tracker.getMetrics();

    assert.strictEqual(metrics.webviewMemory, 0);
    assert.strictEqual(metrics.yamlCacheMemory, 3);
    assert.strictEqual(metrics.totalTrackedMemory, 3);
  });

  it('dispose後は追跡状態をリセットする', async function() {
    const tracker = TextUIMemoryTracker.getInstance();
    tracker.trackDiagnosticsObject({}, ONE_MB * 4);

    await tracker._measureMemoryForTest();
    assert.strictEqual(tracker.getMetrics().diagnosticsMemory, 4);

    tracker.dispose();
    await tracker._measureMemoryForTest();

    const resetMetrics = tracker.getMetrics();
    assert.strictEqual(resetMetrics.webviewMemory, 0);
    assert.strictEqual(resetMetrics.yamlCacheMemory, 0);
    assert.strictEqual(resetMetrics.diagnosticsMemory, 0);
    assert.strictEqual(resetMetrics.renderCacheMemory, 0);
    assert.strictEqual(resetMetrics.totalTrackedMemory, 0);
  });
});
