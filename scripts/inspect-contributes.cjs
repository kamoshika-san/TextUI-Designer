#!/usr/bin/env node
/**
 * T-011: Logical view of merged `package.json` → `contributes` + fragment mapping.
 * Usage: node scripts/inspect-contributes.cjs [--markdown] [--json]
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { PACKAGE_CONTRIBUTES_BUILD } = require('./merge-package-contributes.cjs');

const workspaceRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(workspaceRoot, 'package.json');

const FRAGMENT_NOTES = {
  'configuration.json': 'ユーザー設定（textui-designer.*）。生成元: sync:configuration',
  'commands.json': 'コマンドパレット定義。生成元: sync:commands',
  'menus.json': 'エディタ／パレットメニュー。生成元: sync:commands と連携',
  'languages-snippets.json': 'languages + snippets',
  'schemas.json': 'yaml.schemas + jsonValidation'
};

function loadContributes() {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (!pkg.contributes || typeof pkg.contributes !== 'object') {
    throw new Error('[inspect-contributes] package.json has no contributes object');
  }
  return pkg.contributes;
}

function groupConfiguration(properties) {
  if (!properties || typeof properties !== 'object') return {};
  const groups = {};
  for (const key of Object.keys(properties)) {
    const tail = key.startsWith('textui-designer.') ? key.slice('textui-designer.'.length) : key;
    const head = tail.split('.')[0] || '(root)';
    groups[head] = (groups[head] || 0) + 1;
  }
  return groups;
}

function countMenuEntries(menus) {
  if (!menus || typeof menus !== 'object') return { sections: 0, items: 0 };
  let items = 0;
  const sections = Object.keys(menus).length;
  for (const v of Object.values(menus)) {
    if (Array.isArray(v)) items += v.length;
    else if (v && typeof v === 'object') items += 1;
  }
  return { sections, items };
}

function buildStats(contributes) {
  const configurationProps = contributes.configuration?.properties
    ? Object.keys(contributes.configuration.properties).length
    : 0;
  const commandCount = Array.isArray(contributes.commands) ? contributes.commands.length : 0;
  const menuStats = countMenuEntries(contributes.menus);
  const langCount = Array.isArray(contributes.languages) ? contributes.languages.length : 0;
  const snippetKeys = contributes.snippets && typeof contributes.snippets === 'object' ? Object.keys(contributes.snippets).length : 0;
  const yamlSchemaKeys =
    contributes['yaml.schemas'] && typeof contributes['yaml.schemas'] === 'object'
      ? Object.keys(contributes['yaml.schemas']).length
      : 0;
  const jsonValCount = Array.isArray(contributes.jsonValidation) ? contributes.jsonValidation.length : 0;
  return {
    configurationProps,
    configGroups: groupConfiguration(contributes.configuration?.properties),
    commandCount,
    menuStats,
    langCount,
    snippetKeys,
    yamlSchemaKeys,
    jsonValCount
  };
}

function formatTree(contributes, stats) {
  const lines = [];
  lines.push('package.json → contributes (merged)');
  lines.push('');
  lines.push('Fragment → contributes keys');
  for (const row of PACKAGE_CONTRIBUTES_BUILD) {
    lines.push(`  ${row.fragment}`);
    lines.push(`    → ${row.contributesKeys.join(', ')}`);
    if (FRAGMENT_NOTES[row.fragment]) lines.push(`    (${FRAGMENT_NOTES[row.fragment]})`);
  }
  lines.push('');
  lines.push('Top-level summary');
  lines.push(`  configuration: ${stats.configurationProps} properties`);
  const groupStr = Object.entries(stats.configGroups)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([g, n]) => `${g}:${n}`)
    .join(', ');
  if (groupStr) lines.push(`    by prefix segment: ${groupStr}`);
  lines.push(`  commands: ${stats.commandCount}`);
  lines.push(`  menus: ${stats.menuStats.sections} sections, ${stats.menuStats.items} entries`);
  lines.push(`  languages: ${stats.langCount}`);
  lines.push(`  snippets: ${stats.snippetKeys} language buckets`);
  lines.push(`  yaml.schemas: ${stats.yamlSchemaKeys} patterns`);
  lines.push(`  jsonValidation: ${stats.jsonValCount}`);
  return lines.join('\n');
}

function formatMarkdown(contributes, stats) {
  const lines = [];
  lines.push('## Contributes サマリ（マージ済み）');
  lines.push('');
  lines.push('| フラグメント | `contributes` キー | メモ |');
  lines.push('|---|---|---|');
  for (const row of PACKAGE_CONTRIBUTES_BUILD) {
    const note = (FRAGMENT_NOTES[row.fragment] || '')
      .replace(/\\/g, '\\\\')
      .replace(/\|/g, '\\|');
    lines.push(`| \`${row.fragment}\` | ${row.contributesKeys.map((k) => `\`${k}\``).join(', ')} | ${note} |`);
  }
  lines.push('');
  lines.push('### 規模');
  lines.push('');
  lines.push(`- **configuration**: ${stats.configurationProps} プロパティ`);
  lines.push(`- **commands**: ${stats.commandCount}`);
  lines.push(`- **menus**: ${stats.menuStats.sections} セクション / ${stats.menuStats.items} エントリ`);
  lines.push(`- **languages**: ${stats.langCount}`);
  lines.push(`- **snippets**: ${stats.snippetKeys} 言語キー`);
  lines.push(`- **yaml.schemas**: ${stats.yamlSchemaKeys}`);
  lines.push(`- **jsonValidation**: ${stats.jsonValCount}`);
  lines.push('');
  lines.push('### configuration プロパティ（接頭辞第1セグメント別件数）');
  lines.push('');
  lines.push('| グループ | 件数 |');
  lines.push('|---|---|');
  for (const [g, n] of Object.entries(stats.configGroups).sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`| \`${g}\` | ${n} |`);
  }
  lines.push('');
  lines.push('> 差分は `npm run diff:contributes:fragments`（フラグメント単位）。正本は `package-contributes/*.json` → `npm run sync:package-contributes`。');
  return lines.join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  const asMarkdown = argv.includes('--markdown') || argv.includes('--md');
  const asJson = argv.includes('--json');

  const contributes = loadContributes();
  const stats = buildStats(contributes);

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          packageJson: path.relative(workspaceRoot, packageJsonPath),
          fragmentBuild: PACKAGE_CONTRIBUTES_BUILD,
          stats
        },
        null,
        2
      )
    );
    return;
  }

  if (asMarkdown) {
    console.log(formatMarkdown(contributes, stats));
    return;
  }

  console.log(formatTree(contributes, stats));
}

if (require.main === module) {
  main();
}
