/**
 * T-20260321-129 / Sprint 1 guardrail:
 * `src/renderer/**` 以外、および test code から `renderer/types` を import しないことを検知する。
 *
 * 正本・棚卸し: docs/current/dsl-ssot-types/dsl-types-renderer-types-inventory.md
 */
const assert = require('assert');
const path = require('path');
const {
  findRendererTypesImports,
  rendererRoot,
  repoRoot,
  walkSourceLikeFiles,
} = require('../helpers/renderer-types-guard-helpers');

describe('renderer/types non-renderer import guard (T-20260321-129)', () => {
  it('src/renderer 外および tests 配下から renderer/types への import はゼロである', () => {
    const srcDir = path.join(repoRoot, 'src');
    const testsDir = path.join(repoRoot, 'tests');
    const allFiles = [...walkSourceLikeFiles(srcDir), ...walkSourceLikeFiles(testsDir)];
    const scopedFiles = allFiles.filter((abs) => !(abs.startsWith(rendererRoot + path.sep) || abs === rendererRoot));
    const violations = findRendererTypesImports(scopedFiles).map(
      (rel) => `${rel}: renderer/types import が残存（共有 DSL 型は domain/dsl-types を参照してください）`
    );

    assert.deepStrictEqual(
      violations,
      [],
      `renderer/types 依存の増殖を検知しました。docs/current/dsl-ssot-types/dsl-types-renderer-types-inventory.md を確認してください。\n${violations.join(
        '\n'
      )}`
    );
  });
});
