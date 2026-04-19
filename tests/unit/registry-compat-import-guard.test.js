/**
 * T-20260321-040: registry 互換レイヤ（component-manifest / component-registry）への
 * import が許可リスト外から増殖しないことを検知する。
 *
 * 正本・運用: docs/current/dsl-ssot-types/registry-compat-layer-policy.md
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

/** `src/registry/component-manifest` への import を許可するファイル（POSIX 相対パス） */
const ALLOWED_MANIFEST_IMPORTERS = new Set([
  'src/registry/component-registry.ts',
  'src/cli/validator/component-walker.ts'
]);

/**
 * `src/registry/component-registry` への import を許可するファイル（webview-component-registry は別物）
 * getComponentName 等のユーティリティ利用が増えたら、このリストを更新する（レビュー必須）。
 */
const ALLOWED_REGISTRY_IMPORTERS = new Set(['src/cli/component-traversal.ts']);

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

const reManifestImport = /from\s+['"][^'"]*registry\/component-manifest['"]/;
const reRegistryCompatImport = /from\s+['"][^'"]*\/registry\/component-registry['"]/;

describe('registry compat import guard (T-20260321-040)', () => {
  it('許可リスト外から component-manifest / component-registry（互換）を import しない', () => {
    const srcDir = path.join(repoRoot, 'src');
    const files = walkTsFiles(srcDir);
    const violations = [];

    for (const abs of files) {
      const rel = toPosixRelative(abs);
      const text = fs.readFileSync(abs, 'utf8');

      if (reManifestImport.test(text) && !ALLOWED_MANIFEST_IMPORTERS.has(rel)) {
        violations.push(`${rel}: 禁止または未登録の component-manifest import`);
      }
      if (reRegistryCompatImport.test(text) && !ALLOWED_REGISTRY_IMPORTERS.has(rel)) {
        violations.push(`${rel}: 禁止または未登録の component-registry import`);
      }
    }

    assert.deepStrictEqual(
      violations,
      [],
      `互換レイヤ import の増殖を検知しました。docs/current/dsl-ssot-types/registry-compat-layer-policy.md を確認し、許可リストを更新するか正本へ寄せてください。\n${violations.join(
        '\n'
      )}`
    );
  });
});
