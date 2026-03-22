/**
 * T-20260322-164: src/exporters/html-renderers 配下の .ts の SSoT 境界を固定する。
 * domain/dsl-types 起点・renderer/types（互換レイヤ）非依存。
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const htmlRenderersDir = path.join(repoRoot, 'src', 'exporters', 'html-renderers');

function walkTsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) {
    return out;
  }
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkTsFiles(p, out);
    } else if (/\.ts$/.test(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

function toPosixRelative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

describe('html-renderers exporter SSoT guard (T-20260322-164)', () => {
  it('html-renderers 配下は domain/dsl-types を参照し renderer/types を参照しない', () => {
    const allFiles = walkTsFiles(htmlRenderersDir);
    assert.ok(allFiles.length > 0, 'src/exporters/html-renderers に .ts が存在すること');

    const violations = [];
    const rendererTypesPath = ['renderer', 'types'].join('/');
    const importsDomainDslTypes = /from\s+['"][^'"]*domain\/dsl-types['"]/;
    const importsRendererTypes = new RegExp(`from\\s+['"][^'"]*${rendererTypesPath}['"]`);

    for (const abs of allFiles) {
      const rel = toPosixRelative(abs);
      const code = fs.readFileSync(abs, 'utf8');
      if (!importsDomainDslTypes.test(code)) {
        violations.push(`${rel}: domain/dsl-types import が存在しない`);
      }
      if (importsRendererTypes.test(code)) {
        violations.push(`${rel}: renderer/types import が残存`);
      }
    }

    assert.deepStrictEqual(
      violations,
      [],
      `html-renderers の SSoT 境界違反を検知\n${violations.join('\n')}`
    );
  });
});
