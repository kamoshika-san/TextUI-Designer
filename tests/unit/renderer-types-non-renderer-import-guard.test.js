/**
 * T-20260321-113: `src/renderer/**` 以外から `renderer/types` を import する箇所が
 * 許可リスト外に増えないことを検知する（Phase 0・ADR 0003 移行期）。
 *
 * 正本・棚卸し: docs/dsl-types-renderer-types-inventory.md
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

/**
 * 現状の import 元（POSIX）。新規に `renderer/types` へ依存する場合は
 * PR で本リストを更新するか、`domain/dsl-types` へ寄せる。
 */
const ALLOWED_RENDERER_TYPES_IMPORTERS = new Set([
  'src/cli/exporter-runner.ts',
  'src/cli/openapi/dsl-builder.ts',
  'src/cli/openapi/types.ts',
  'src/cli/provider-registry.ts',
  'src/cli/theme-token-resolver.ts',
  'src/cli/types.ts',
  'src/core/textui-core-component-builder.ts',
  'src/core/textui-core-engine-format.ts',
  'src/core/textui-core-helpers.ts',
  'src/dsl/load-dsl-with-includes.ts',
  'src/exporters/base-component-renderer.ts',
  'src/exporters/html-exporter.ts',
  'src/exporters/html-renderers/html-form-renderer.ts',
  'src/exporters/html-renderers/html-layout-renderer.ts',
  'src/exporters/html-renderers/html-renderer-utils.ts',
  'src/exporters/html-renderers/html-textual-renderer.ts',
  'src/exporters/pug-exporter.ts',
  'src/exporters/pug/pug-basic-templates.ts',
  'src/exporters/pug/pug-form-fragments.ts',
  'src/exporters/pug/pug-layout-templates.ts',
  'src/exporters/react-basic-renderer.ts',
  'src/exporters/react-exporter.ts',
  'src/exporters/react-form-control-templates.ts',
  'src/exporters/react-static-export.ts',
  'src/exporters/react-template-renderer.ts',
  'src/exporters/svelte-exporter.ts',
  'src/exporters/vue-exporter.ts',
  'src/types/services.ts',
  'src/types/webview.ts',
  'src/utils/preview-capture.ts',
  'src/utils/preview-capture/html-preparation.ts',
  'src/utils/style-manager.ts',
]);

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

describe('renderer/types non-renderer import guard (T-20260321-113)', () => {
  it('src/renderer 外から renderer/types への import は許可リストのみ', () => {
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
      if (reRendererTypesImport.test(text) && !ALLOWED_RENDERER_TYPES_IMPORTERS.has(rel)) {
        violations.push(`${rel}: 未登録の renderer/types import（許可リストを更新するか domain/dsl-types へ寄せてください）`);
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
