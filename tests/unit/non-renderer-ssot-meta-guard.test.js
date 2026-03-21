/**
 * T-20260322-152:
 * 非 renderer レイヤ横断で renderer/types 逆流を一括検知するメタガード。
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const targetDirs = [
  'src/core',
  'src/cli',
  'src/utils',
  'src/services',
  'src/types',
  'src/exporters',
  'src/registry',
];
const rendererTypesImport = /from\s+['"][^'"]*renderer\/types['"]/;

function walkSourceLikeFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkSourceLikeFiles(full, out);
      continue;
    }
    if (/\.(ts|tsx|js)$/.test(ent.name)) out.push(full);
  }
  return out;
}

function rel(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

describe('non-renderer SSoT meta guard (T-20260322-152)', () => {
  it('core/cli/utils/services/types/exporters/registry に renderer/types import が存在しない', () => {
    const violations = [];
    for (const dir of targetDirs) {
      const absDir = path.join(repoRoot, dir);
      for (const file of walkSourceLikeFiles(absDir)) {
        const code = fs.readFileSync(file, 'utf8');
        if (rendererTypesImport.test(code)) {
          violations.push(`${rel(file)}: renderer/types import が残存`);
        }
      }
    }
    assert.deepStrictEqual(violations, [], `非 renderer レイヤ横断の SSoT 境界違反を検知\n${violations.join('\n')}`);
  });
});
