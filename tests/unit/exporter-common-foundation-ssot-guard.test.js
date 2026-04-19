/**
 * T-20260322-153:
 * exporter 共通基盤（base/export-types/export-pipeline）の
 * shared DSL 型 import 起点を domain/dsl-types に固定する。
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const targets = [
  'src/exporters/legacy/base-component-renderer.ts',
  'src/exporters/export-types.ts',
  'src/exporters/export-pipeline.ts',
];

describe('exporter common foundation SSoT guard (T-20260322-153)', () => {
  it('共通基盤は domain/dsl-types を参照し、renderer/types を参照しない', () => {
    const violations = [];
    for (const rel of targets) {
      const code = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
      const importsDomainDslTypes = /from\s+['"][^'"]*domain\/dsl-types['"]/.test(code);
      const importsRendererTypes = /from\s+['"][^'"]*renderer\/types['"]/.test(code);

      if (!importsDomainDslTypes) {
        violations.push(`${rel}: domain/dsl-types import が存在しない`);
      }
      if (importsRendererTypes) {
        violations.push(`${rel}: renderer/types import が残存`);
      }
    }

    assert.deepStrictEqual(violations, [], `exporter 共通基盤の SSoT 境界違反を検知\n${violations.join('\n')}`);
  });
});
