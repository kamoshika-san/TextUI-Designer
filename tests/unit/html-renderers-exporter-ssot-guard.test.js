const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const htmlRenderersDir = path.join(repoRoot, 'src', 'exporters', 'legacy', 'html-renderers');
const exportersDir = path.join(repoRoot, 'src', 'exporters');

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

describe('html-renderers exporter legacy removal guard (T-20260422-014)', () => {
  it('legacy html-renderers TypeScript files are absent', () => {
    assert.deepStrictEqual(
      walkTsFiles(htmlRenderersDir).map(toPosixRelative),
      [],
      'src/exporters/legacy/html-renderers must not contain tracked TypeScript files; HtmlExporter is primary-only'
    );
  });

  it('exporter source does not import legacy html-renderers', () => {
    const violations = [];
    for (const abs of walkTsFiles(exportersDir)) {
      const rel = toPosixRelative(abs);
      const code = fs.readFileSync(abs, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      if (/legacy\/html-renderers|html-renderers/.test(code)) {
        violations.push(rel);
      }
    }

    assert.deepStrictEqual(violations, [], `legacy html-renderers import/reference found\n${violations.join('\n')}`);
  });
});
