const assert = require('assert');

const { PerformanceMonitor } = require('../../out/utils/performance-monitor');
const { Logger } = require('../../out/utils/logger');
const { ExportObservabilityRecorder } = require('../../out/exporters/export-observability-recorder');

describe('ExportObservabilityRecorder', () => {
  beforeEach(() => {
    const monitor = PerformanceMonitor.getInstance();
    monitor.dispose();
    monitor.clear();
    monitor.forceEnable();
  });

  it('stores downgrade reason and records fallback sample with reason', () => {
    const monitor = PerformanceMonitor.getInstance();
    const recorder = new ExportObservabilityRecorder(monitor, new Logger('ExportObservabilityRecorderTest'));

    recorder.markIncrementalDowngrade('invalid-incremental-result');
    const startedAt = performance.now() - 5;
    recorder.recordIncrementalRouteSample('incremental-diff', startedAt, {
      outcome: 'fallback',
      failureKind: 'invalid-result'
    });

    const metrics = monitor.getIncrementalRouteMetrics();
    assert.strictEqual(recorder.lastIncrementalDowngradeReason, 'invalid-incremental-result');
    assert.strictEqual(metrics.diffRoute.totalSamples, 1);
    assert.strictEqual(metrics.diffRoute.fallbackCount, 1);
    assert.strictEqual(metrics.fallbackReasons['invalid-incremental-result'], 1);
  });

  it('resets downgrade reason and records success sample without fallback reason', () => {
    const monitor = PerformanceMonitor.getInstance();
    const recorder = new ExportObservabilityRecorder(monitor, new Logger('ExportObservabilityRecorderTest'));
    recorder.markIncrementalDowngrade('temporary-reason');
    recorder.resetIncrementalDowngradeReason();

    const startedAt = performance.now() - 5;
    recorder.recordIncrementalRouteSample('incremental-diff', startedAt, {
      outcome: 'success'
    });

    const metrics = monitor.getIncrementalRouteMetrics();
    assert.strictEqual(recorder.lastIncrementalDowngradeReason, null);
    assert.strictEqual(metrics.diffRoute.totalSamples, 1);
    assert.strictEqual(metrics.diffRoute.successCount, 1);
    assert.deepStrictEqual(metrics.fallbackReasons, {});
  });
});
