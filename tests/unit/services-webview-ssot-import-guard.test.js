/**
 * T-20260322-149:
 * services/webview 境界契約（src/types/services.ts, src/types/webview.ts）の
 * SSoT import 起点を固定する。
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

function read(file) {
  return fs.readFileSync(path.join(repoRoot, file), 'utf8');
}

describe('services/webview contract SSoT import guard (T-20260322-149)', () => {
  it('src/types/services.ts と src/types/webview.ts は domain/dsl-types 起点で renderer/types を参照しない', () => {
    const targets = ['src/types/services.ts', 'src/types/webview.ts'];
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

    assert.deepStrictEqual(violations, [], `services/webview 契約の SSoT 境界違反を検知\n${violations.join('\n')}`);
  });
});
