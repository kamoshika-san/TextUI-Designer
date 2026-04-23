/**
 * T-043: ExportManager facade / wiring 境界の import ガード。
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('export manager boundary import guard (T-043)', () => {
  it('ExportManager は cache/diff/monitor/pipeline の実装詳細へ直接依存しない', () => {
    const managerCode = read('src/exporters/export-manager.ts');
    const forbiddenImports = [
      'from \'../utils/cache-manager\'',
      'from \'./metrics/diff-manager\'',
      'from \'../utils/config-manager\'',
      'from \'../utils/logger\'',
      'from \'./built-in-exporter-registry\'',
      'from \'./export-metrics-observer\'',
      'from \'./export-pipeline\''
    ];
    const violations = forbiddenImports
      .filter(token => managerCode.includes(token))
      .map(token => `src/exporters/export-manager.ts: forbidden import detected -> ${token}`);

    assert.deepStrictEqual(violations, [], `ExportManager facade 境界違反を検知\n${violations.join('\n')}`);
  });

  it('Composition root が ConfigManager と PerformanceMonitor を組み立てる', () => {
    const compositionCode = read('src/exporters/export-manager-composition-root.ts');
    const requiredImports = [
      'from \'../utils/config-manager\'',
      'from \'../utils/performance-monitor\''
    ];
    const missing = requiredImports
      .filter(token => !compositionCode.includes(token))
      .map(token => `src/exporters/export-manager-composition-root.ts: required import missing -> ${token}`);

    assert.deepStrictEqual(missing, [], `ExportManager composition root 契約違反を検知\n${missing.join('\n')}`);
  });
});
