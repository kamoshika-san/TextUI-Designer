#!/usr/bin/env node
/**
 * T-001: exporter-boundary-guide.md に HTML primary/fallback 契約のアンカーが残っていることを検証する。
 * （ドキュメント縮退の早期検知 — fallback レーンの機械的レビューガードの一部）
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const docPath = path.join(
  repoRoot,
  'docs',
  'current',
  'runtime-boundaries',
  'exporter-boundary-guide.md'
);

const requiredAnchors = [
  'T-001-ANCHOR:PRIMARY-IS-SOURCE-OF-TRUTH',
  'T-001-ANCHOR:FALLBACK-IS-COMPATIBILITY-LANE-ONLY',
  'T-001-ANCHOR:NO-NEW-PRODUCT-FEATURES-IN-FALLBACK-PATH',
];

function main() {
  if (!fs.existsSync(docPath)) {
    console.error(`[T-001] missing guide: ${docPath}`);
    process.exit(1);
  }
  const text = fs.readFileSync(docPath, 'utf8');
  const missing = requiredAnchors.filter((a) => !text.includes(a));
  if (missing.length) {
    console.error('[T-001] exporter-boundary-guide.md is missing required contract anchors:');
    for (const m of missing) {
      console.error(`  - ${m}`);
    }
    process.exit(1);
  }
  console.log('[T-001] html exporter fallback lane contract anchors: OK');
}

main();
