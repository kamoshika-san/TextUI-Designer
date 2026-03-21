/**
 * T-20260321-138: cli/utils/registry/types レイヤの SSoT import 境界を検知する。
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

function walkTsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) {
    return out;
  }
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

describe('cli/utils/registry/types SSoT import guard (T-20260321-138)', () => {
  it('対象レイヤに renderer/types import が存在しない', () => {
    const targets = [
      path.join(repoRoot, 'src', 'cli'),
      path.join(repoRoot, 'src', 'utils'),
      path.join(repoRoot, 'src', 'registry'),
      path.join(repoRoot, 'src', 'types'),
    ];
    const rendererTypesImport = /from\s+['"][^'"]*renderer\/types['"]/;
    const violations = [];

    for (const dir of targets) {
      for (const abs of walkTsFiles(dir)) {
        const rel = toPosixRelative(abs);
        const text = fs.readFileSync(abs, 'utf8');
        if (rendererTypesImport.test(text)) {
          violations.push(`${rel}: renderer/types import が残存`);
        }
      }
    }

    assert.deepStrictEqual(
      violations,
      [],
      `cli/utils/registry/types の SSoT 境界違反を検知\n${violations.join('\n')}`
    );
  });
});
