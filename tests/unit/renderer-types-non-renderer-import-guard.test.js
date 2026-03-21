/**
 * T-20260321-129: `src/renderer/**` 以外から `renderer/types` を import しないことを検知する。
 *
 * 正本・棚卸し: docs/dsl-types-renderer-types-inventory.md
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

const reRendererTypesImport = /from\s+['"][^'"]*renderer\/types['"]/;

function walkTsFiles(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkTsFiles(p, out);
    } else if (/\.(ts|tsx)$/.test(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

function toPosixRelative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

describe('renderer/types non-renderer import guard (T-20260321-129)', () => {
  it('src/renderer 外から renderer/types への import はゼロである', () => {
    const srcDir = path.join(repoRoot, 'src');
    const rendererRoot = path.join(srcDir, 'renderer');
    const allFiles = walkTsFiles(srcDir);
    const violations = [];

    for (const abs of allFiles) {
      if (abs.startsWith(rendererRoot + path.sep) || abs === rendererRoot) {
        continue;
      }
      const rel = toPosixRelative(abs);
      const text = fs.readFileSync(abs, 'utf8');
      if (reRendererTypesImport.test(text)) {
        violations.push(`${rel}: renderer/types import が残存（domain/dsl-types へ移行してください）`);
      }
    }

    assert.deepStrictEqual(
      violations,
      [],
      `renderer/types 依存の増殖を検知しました。docs/dsl-types-renderer-types-inventory.md を確認してください。\n${violations.join(
        '\n'
      )}`
    );
  });
});
