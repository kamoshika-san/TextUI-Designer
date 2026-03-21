/**
 * T-20260321-139: テストコード中の SSoT 用語と参照経路の逸脱を検知する。
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const testsDir = path.join(repoRoot, 'tests');

const ALLOW_RENDERER_TYPES_MENTION = new Set([
  'tests/unit/renderer-types-thin-facade.test.js',
  'tests/unit/renderer-types-non-renderer-import-guard.test.js',
  'tests/unit/exporters-ssot-import-guard.test.js',
  'tests/unit/exporter-common-foundation-ssot-guard.test.js',
  'tests/unit/cli-utils-registry-ssot-import-guard.test.js',
  'tests/unit/cli-utils-registry-domain-origin-guard.test.js',
  'tests/unit/services-webview-ssot-import-guard.test.js',
  'tests/unit/dsl-load-path-ssot-import-guard.test.js',
  'tests/unit/non-renderer-ssot-meta-guard.test.js',
  'tests/unit/component-def-renderer-union-alignment.test.js',
  'tests/unit/tests-ssot-terminology-guard.test.js',
]);

function walkJsTsFiles(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkJsTsFiles(p, out);
    } else if (/\.(js|ts|tsx)$/.test(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

function toPosixRelative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

describe('tests SSoT terminology guard (T-20260321-139)', () => {
  it('許可済みガード以外で renderer/types 参照を増やさない', () => {
    const violations = [];
    const mention = /renderer\/types/;

    for (const abs of walkJsTsFiles(testsDir)) {
      const rel = toPosixRelative(abs);
      if (ALLOW_RENDERER_TYPES_MENTION.has(rel)) {
        continue;
      }
      const text = fs.readFileSync(abs, 'utf8');
      if (mention.test(text)) {
        violations.push(`${rel}: renderer/types 言及が許可リスト外で検出`);
      }
    }

    assert.deepStrictEqual(
      violations,
      [],
      `テストコードの SSoT 用語逸脱を検知\n${violations.join('\n')}`
    );
  });
});
