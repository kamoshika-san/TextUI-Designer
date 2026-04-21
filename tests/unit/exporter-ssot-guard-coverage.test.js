/**
 * T-20260322-156:
 * exporter 専用 SSoT ガードの対象網羅を固定する。
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const REQUIRED_EXPORTER_FILES = [
  'src/exporters/export-types.ts',
  'src/exporters/export-pipeline.ts',
  'src/exporters/react-exporter.ts',
  'src/exporters/react-template-renderer.ts',
  'src/exporters/react-basic-renderer.ts',
  'src/exporters/react-form-control-templates.ts',
  'src/exporters/html-exporter.ts',
  'src/exporters/pug-exporter.ts',
  'src/exporters/vue-exporter.ts',
  'src/exporters/svelte-exporter.ts',
];

describe('exporter SSoT guard coverage (T-20260322-156)', () => {
  it('主要 exporter 群は domain/dsl-types 起点で、互換レイヤ参照を残さない', () => {
    const violations = [];
    const rendererTypesPath = ['renderer', 'types'].join('/');

    for (const rel of REQUIRED_EXPORTER_FILES) {
      const abs = path.join(repoRoot, rel);
      if (!fs.existsSync(abs)) {
        violations.push(`${rel}: ファイルが存在しない`);
        continue;
      }
      const code = fs.readFileSync(abs, 'utf8');
      const importsDomainDslTypes = /from\s+['"][^'"]*domain\/dsl-types['"]/.test(code);
      const importsRendererTypes = new RegExp(`from\\s+['"][^'"]*${rendererTypesPath}['"]`).test(code);
      if (!importsDomainDslTypes) {
        violations.push(`${rel}: domain/dsl-types import が存在しない`);
      }
      if (importsRendererTypes) {
        violations.push(`${rel}: renderer types import が残存`);
      }
    }

    assert.deepStrictEqual(violations, [], `exporter SSoT ガード網羅違反を検知\n${violations.join('\n')}`);
  });
});
