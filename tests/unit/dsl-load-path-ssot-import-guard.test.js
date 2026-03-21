/**
 * T-20260322-150:
 * DSL 読込中枢（load-dsl-with-includes.ts）が domain 型起点を維持し、
 * renderer/types へ逆流しないことを固定する。
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const target = path.join(repoRoot, 'src', 'dsl', 'load-dsl-with-includes.ts');

describe('dsl load path SSoT import guard (T-20260322-150)', () => {
  it('load-dsl-with-includes.ts は domain/dsl-types を参照し renderer/types を参照しない', () => {
    const code = fs.readFileSync(target, 'utf8');
    const importsDomainDslTypes = /from\s+['"][^'"]*domain\/dsl-types['"]/.test(code);
    const importsRendererTypes = /from\s+['"][^'"]*renderer\/types['"]/.test(code);

    assert.strictEqual(importsDomainDslTypes, true, 'src/dsl/load-dsl-with-includes.ts に domain/dsl-types import が必要です');
    assert.strictEqual(importsRendererTypes, false, 'src/dsl/load-dsl-with-includes.ts に renderer/types import は禁止です');
  });
});
