/**
 * T-20260321-134 / Epic A A3:
 * `renderer/types` 削除後も legacy import path を ESLint で禁止し続ける。
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

describe('SSoT eslint restriction scope guard', () => {
  it('eslint no-restricted-imports が error であり、対象スコープが維持されている', () => {
    const p = path.join(repoRoot, 'eslint.config.mjs');
    const raw = fs.readFileSync(p, 'utf8');

    assert.ok(
      raw.includes('const rendererTypesImportRestriction = ["error", {'),
      'rendererTypesImportRestriction must remain error level'
    );
    assert.ok(raw.includes('"**/renderer/types"'), 'restricted-import group must include "**/renderer/types"');
    assert.ok(!raw.includes('"**/renderer/types.ts"'), 'deleted facade path should not require a dedicated .ts restriction');

    const requiredGlobs = [
      'src/core/**/*.ts',
      'src/core/**/*.tsx',
      'src/exporters/**/*.ts',
      'src/exporters/**/*.tsx',
      'src/cli/**/*.ts',
      'src/cli/**/*.tsx',
      'src/utils/**/*.ts',
      'src/utils/**/*.tsx',
      'tests/**/*.ts',
      'tests/**/*.tsx',
      'tests/**/*.js',
    ];

    for (const glob of requiredGlobs) {
      assert.ok(raw.includes(`"${glob}"`), `missing restricted-import scope glob: ${glob}`);
    }
  });
});
