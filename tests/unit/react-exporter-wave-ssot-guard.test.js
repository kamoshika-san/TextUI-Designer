/**
 * T-20260322-154:
 * React exporter wave の shared DSL 型 import 起点を
 * domain/dsl-types に固定する（互換レイヤ逆流を禁止）。
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const targets = [
  'src/exporters/react-exporter.ts',
  'src/exporters/react-template-renderer.ts',
  'src/exporters/react-basic-renderer.ts',
  'src/exporters/react-form-control-templates.ts',
];

describe('react exporter wave SSoT guard (T-20260322-154)', () => {
  it('React exporter wave は domain/dsl-types を参照し、互換レイヤ参照を残さない', () => {
    const violations = [];
    const rendererTypesPath = ['renderer', 'types'].join('/');
    for (const rel of targets) {
      const code = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
      const importsDomainDslTypes = /from\s+['"][^'"]*domain\/dsl-types['"]/.test(code);
      const importsRendererTypes = new RegExp(`from\\s+['"][^'"]*${rendererTypesPath}['"]`).test(code);

      if (!importsDomainDslTypes) {
        violations.push(`${rel}: domain/dsl-types import が存在しない`);
      }
      if (importsRendererTypes) {
        violations.push(`${rel}: renderer types import が残存`);
      }
    }

    assert.deepStrictEqual(violations, [], `React exporter wave の SSoT 境界違反を検知\n${violations.join('\n')}`);
  });
});
