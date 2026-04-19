/**
 * テスト分類タグ（パイロット / T-20260321-044）
 *
 * - `[area:exporter]` … PR テンプレの「exporter」分類・export パイプライン周辺の失敗切り分け用
 * - `@tier-unit` … `npm run test:unit` に含まれる層。例: `npx mocha --grep "@tier-unit"`（プロジェクトの mocha 設定に従う）
 *
 * 運用上の「緑の main」・必須 CI チェックの定義は `docs/current/testing-ci/ci-quality-gate.md`（T-043）を参照。
 */
const assert = require('assert');
const { ConfigManager } = require('../../out/utils/config-manager');
const { isExportPipelineMetricsEnabled } = require('../../out/exporters/export-instrumentation');

describe('export instrumentation [area:exporter] @tier-unit (T-20260321-041)', () => {
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
