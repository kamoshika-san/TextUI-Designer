const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const srcDir = path.join(repoRoot, 'src');
const fallbackLiteral = /useReactRender\s*:\s*false\b/;
const allowedLiteralFiles = new Set([
  'src/exporters/html-export-lane-options.ts'
]);

function walkSourceLikeFiles(dir, out = []) {
  if (!fs.existsSync(dir)) {
    return out;
  }
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkSourceLikeFiles(full, out);
      continue;
    }
    if (/\.(ts|tsx|js)$/.test(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

function toPosixRelative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

describe('HtmlExporter fallback entry guard (T-20260322-354)', () => {
  it('src では useReactRender: false の直書きを helper 定義だけに制限する', () => {
    const violations = [];

    for (const filePath of walkSourceLikeFiles(srcDir)) {
      const rel = toPosixRelative(filePath);
      const text = stripComments(fs.readFileSync(filePath, 'utf8'));
      if (fallbackLiteral.test(text) && !allowedLiteralFiles.has(rel)) {
        violations.push(`${rel}: useReactRender: false must go through html-export-lane-options helper`);
      }
    }

    assert.deepStrictEqual(
      violations,
      [],
      `Unexpected fallback entrypoint detected in src/**\n${violations.join('\n')}`
    );
  });
});
