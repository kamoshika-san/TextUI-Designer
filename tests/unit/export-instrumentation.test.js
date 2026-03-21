const assert = require('assert');
const { ConfigManager } = require('../../out/utils/config-manager');
const { isExportPipelineMetricsEnabled } = require('../../out/exporters/export-instrumentation');

describe('export instrumentation (T-20260321-041)', () => {
  const orig = ConfigManager.getPerformanceSettings;

  afterEach(() => {
    ConfigManager.getPerformanceSettings = orig;
  });

  it('isExportPipelineMetricsEnabled は enablePerformanceLogs を反映する', () => {
    ConfigManager.getPerformanceSettings = () => ({ ...orig.call(ConfigManager), enablePerformanceLogs: true });
    assert.strictEqual(isExportPipelineMetricsEnabled(), true);

    ConfigManager.getPerformanceSettings = () => ({ ...orig.call(ConfigManager), enablePerformanceLogs: false });
    assert.strictEqual(isExportPipelineMetricsEnabled(), false);
  });
});
