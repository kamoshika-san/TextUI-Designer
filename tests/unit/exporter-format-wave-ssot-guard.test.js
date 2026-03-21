/**
 * T-20260322-155:
 * HTML/Pug/Vue/Svelte exporter wave の shared DSL 型 import 起点を
 * domain/dsl-types に固定する。
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const targets = [
  'src/exporters/html-exporter.ts',
  'src/exporters/pug-exporter.ts',
  'src/exporters/vue-exporter.ts',
  'src/exporters/svelte-exporter.ts',
];

describe('exporter format wave SSoT guard (T-20260322-155)', () => {
  it('HTML/Pug/Vue/Svelte exporter は domain/dsl-types を参照し互換レイヤ参照を残さない', () => {
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

    assert.deepStrictEqual(violations, [], `Exporter format wave の SSoT 境界違反を検知\n${violations.join('\n')}`);
  });
});
