/**
 * T-DRAIN-002:
 * 低リスク移行対象（utils）の SSoT import 起点を固定する。
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

function read(file) {
  return fs.readFileSync(path.join(repoRoot, file), 'utf8');
}

describe('utils SSoT import guard (T-DRAIN-002)', () => {
  it('style-manager / preview-capture 系は domain/dsl-types 起点で renderer/types を参照しない', () => {
    const targets = [
      'src/utils/style-manager.ts',
      'src/utils/preview-capture.ts',
      'src/utils/preview-capture/html-preparation.ts',
    ];
    const violations = [];

    for (const rel of targets) {
      const code = read(rel);
      const importsDomainDslTypes = /from\s+['"][^'"]*domain\/dsl-types['"]/.test(code);
      const importsRendererTypes = /from\s+['"][^'"]*renderer\/types['"]/.test(code);

      if (!importsDomainDslTypes) {
        violations.push(`${rel}: domain/dsl-types import が存在しない`);
      }
      if (importsRendererTypes) {
        violations.push(`${rel}: renderer/types import が残存`);
      }
    }

    assert.deepStrictEqual(violations, [], `utils の SSoT 境界違反を検知\n${violations.join('\n')}`);
  });
});
