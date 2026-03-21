/**
 * T-121（E-DSL-SSOT Sprint 1）: `src/renderer/types.ts` が domain への再エクスポートのみであり、
 * DSL 型の二重定義が再発していないことを検知する。
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

describe('renderer/types thin facade (SSoT)', () => {
  it('src/renderer/types.ts は domain/dsl-types への再エクスポートのみ（型本体を書かない）', () => {
    const p = path.join(repoRoot, 'src', 'renderer', 'types.ts');
    const raw = fs.readFileSync(p, 'utf8');
    const noBlockComments = raw.replace(/\/\*[\s\S]*?\*\//g, '');
    const lines = noBlockComments
      .split(/\r?\n/)
      .map((l) => l.replace(/\/\/.*$/, '').trim())
      .filter((l) => l.length > 0);

    const exportLines = lines.filter((l) => /^export\b/.test(l));
    assert.strictEqual(exportLines.length, 1, `expected exactly one export, got: ${exportLines.join(' | ')}`);

    const one = exportLines[0].replace(/\s+/g, ' ');
    assert.ok(
      /^export \* from ['"]\.\.\/domain\/dsl-types['"];?$/.test(one),
      `expected "export * from '../domain/dsl-types'", got: ${one}`
    );

    const forbidden = /\bexport\s+(interface|function|class|const|enum)\b/;
    assert.ok(!forbidden.test(noBlockComments), 'renderer/types must not declare interface/function/class/const/enum');

    assert.ok(
      !/\bexport\s+type\s+[A-Za-z_][\w]*\s*=/.test(noBlockComments),
      'renderer/types must not declare export type aliases (use domain/dsl-types)'
    );
  });
});
