#!/usr/bin/env node
/**
 * T-011: Regenerate docs/current/services-webview/package-contributes-fragments-responsibility.md
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { PACKAGE_CONTRIBUTES_BUILD } = require('./merge-package-contributes.cjs');

const workspaceRoot = path.resolve(__dirname, '..');
const fragmentsDir = path.join(workspaceRoot, 'package-contributes');
const outPath = path.join(
  workspaceRoot,
  'docs/current/services-webview/package-contributes-fragments-responsibility.md'
);

const RESPONSIBILITY = {
  'configuration.json':
    '拡張機能の **設定 UI**（`contributes.configuration`）。キーは `textui-designer.*`。既定値・説明文の正本。多くは `npm run sync:configuration` で生成。',
  'commands.json':
    '**コマンドパレット**用の `Command[]`（`contributes.commands`）。`npm run sync:commands` でマニフェストと同期。',
  'menus.json':
    '`contributes.menus`（エディタタイトルバー・コンテキスト等）。通常は **commands と同時生成**（sync:commands）。',
  'languages-snippets.json':
    '`contributes.languages` と `contributes.snippets`。YAML/JSON 言語登録とスニペット JSON への参照。',
  'schemas.json':
    '`contributes["yaml.schemas"]` と `contributes.jsonValidation`。DSL・テーマ・テンプレートの JSON Schema 割当。'
};

function fragmentStats(fragment) {
  const p = path.join(fragmentsDir, fragment);
  if (!fs.existsSync(p)) return { bytes: 0, note: '(missing)' };
  const raw = fs.readFileSync(p, 'utf8');
  let keys = 0;
  try {
    const j = JSON.parse(raw);
    if (Array.isArray(j)) keys = j.length;
    else if (j && typeof j === 'object') keys = Object.keys(j).length;
  } catch {
    keys = 0;
  }
  return { bytes: Buffer.byteLength(raw, 'utf8'), keys };
}

function main() {
  const iso = new Date().toISOString().slice(0, 19) + 'Z';
  const lines = [];
  lines.push('---');
  lines.push('governance: generated');
  lines.push(`generated_at: ${iso}`);
  lines.push('---');
  lines.push('');
  lines.push('# package-contributes フラグメント責務（T-011）');
  lines.push('');
  lines.push(
    'このファイルの **表と「生成メタ」節**は `npm run docs:package-contributes` で上書きされます。説明文の正本は各 `package-contributes/*.json` と本リポジトリの方針ドキュメントです。'
  );
  lines.push('');
  lines.push('## 運用の要点');
  lines.push('');
  lines.push(
    '- **`package.json` の `contributes` を直接編集しない**（マージ結果の閲覧は `npm run inspect:contributes`）。'
  );
  lines.push('- フラグメントを編集したら **`npm run sync:package-contributes`**（必要に応じて先に `sync:commands` / `sync:configuration`）。');
  lines.push('- 変更の俯瞰: **`npm run diff:contributes:fragments`**（`--base=main` 可）。');
  lines.push('');
  lines.push('## フラグメント一覧（責務）');
  lines.push('');
  lines.push('| ファイル | マージ先 `contributes` キー | 責務 |');
  lines.push('|---|---|---|');
  for (const row of PACKAGE_CONTRIBUTES_BUILD) {
    const resp = (RESPONSIBILITY[row.fragment] || '—').replace(/\|/g, '\\|');
    const keys = row.contributesKeys.map((k) => `\`${k}\``).join('<br>');
    lines.push(`| \`${row.fragment}\` | ${keys} | ${resp} |`);
  }
  lines.push('');
  lines.push('## 生成メタ（自動）');
  lines.push('');
  lines.push(`- **generated_at**: ${iso}`);
  lines.push('');
  lines.push('| フラグメント | サイズ(bytes) | トップレベルキー数 / 配列長 |');
  lines.push('|---|---:|---:|');
  for (const row of PACKAGE_CONTRIBUTES_BUILD) {
    const st = fragmentStats(row.fragment);
    lines.push(`| \`${row.fragment}\` | ${st.bytes} | ${st.keys} |`);
  }
  lines.push('');
  lines.push('## 関連');
  lines.push('');
  lines.push('- [package-contributes 方針](./package-contributes-policy.md)');
  lines.push('- リポジトリ README の「Package `contributes`」節');
  lines.push('');

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log(`[generate-package-contributes-docs] wrote ${path.relative(workspaceRoot, outPath)}`);
}

if (require.main === module) {
  main();
}
