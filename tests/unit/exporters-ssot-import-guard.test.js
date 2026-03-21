/**
 * T-20260321-137: exporters レイヤの SSoT import 境界を検知する。
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const exportersDir = path.join(repoRoot, 'src', 'exporters');

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

describe('exporters SSoT import guard (T-20260321-137)', () => {
  it('exporters レイヤに renderer/types import が存在しない', () => {
    const allFiles = walkTsFiles(exportersDir);
    const violations = [];
    const rendererTypesImport = /from\s+['"][^'"]*renderer\/types['"]/;

    for (const abs of allFiles) {
      const rel = toPosixRelative(abs);
      const text = fs.readFileSync(abs, 'utf8');
      if (rendererTypesImport.test(text)) {
        violations.push(`${rel}: renderer/types import が残存`);
      }
    }

    assert.deepStrictEqual(violations, [], `exporters の SSoT 境界違反を検知\n${violations.join('\n')}`);
  });
});
