/**
 * T-121 / E-DSL-SSOT Sprint 1:
 * `src/renderer/types.ts` が thin facade のままか、A3 後に不在でも残存 import が無いことを確認する。
 */
const assert = require('assert');
const {
  findRendererTypesImports,
  readOptionalFile,
  rendererRoot,
  rendererTypesFacadePath,
  walkSourceLikeFiles,
} = require('../helpers/renderer-types-guard-helpers');

describe('renderer/types thin facade (SSoT)', () => {
  it('src/renderer/types.ts は absent か thin facade のどちらかである', () => {
    const raw = readOptionalFile(rendererTypesFacadePath);
    if (raw === null) {
      const rendererFiles = walkSourceLikeFiles(rendererRoot).filter((filePath) => filePath !== rendererTypesFacadePath);
      const violations = findRendererTypesImports(rendererFiles).map(
        (rel) => `${rel}: facade file absent 後も renderer/types import が残存`
      );
      assert.deepStrictEqual(
        violations,
        [],
        `renderer/types facade 削除後に renderer 配下の import が残っています。\n${violations.join('\n')}`
      );
      return;
    }

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

    const rendererFiles = walkSourceLikeFiles(rendererRoot).filter((filePath) => filePath !== rendererTypesFacadePath);
    const violations = findRendererTypesImports(rendererFiles).map(
      (rel) => `${rel}: thin facade 存在中でも renderer/types を経由している`
    );
    assert.deepStrictEqual(
      violations,
      [],
      `renderer 配下の renderer/types 経由 import が残っています。\n${violations.join('\n')}`
    );
  });
});
