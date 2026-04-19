const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(workspaceRoot, 'package.json');
const commandCatalogPath = path.join(workspaceRoot, 'out', 'services', 'command-catalog.js');
const fragmentsDir = path.join(workspaceRoot, 'package-contributes');

if (!fs.existsSync(commandCatalogPath)) {
  throw new Error(
    `command-catalog のビルド成果物が見つかりません: ${commandCatalogPath}\n` +
    '先に `npm run compile` を実行してください。'
  );
}

const {
  getPackageCommandContributions,
  getPackageMenuContributions
} = require(commandCatalogPath);

const { mergePackageContributes } = require('./merge-package-contributes.cjs');

if (!fs.existsSync(packageJsonPath)) {
  throw new Error(`package.json が見つかりません: ${packageJsonPath}`);
}

const nextCommands = getPackageCommandContributions();
const nextMenus = getPackageMenuContributions();

fs.mkdirSync(fragmentsDir, { recursive: true });
fs.writeFileSync(
  path.join(fragmentsDir, 'commands.json'),
  `${JSON.stringify(nextCommands, null, 2)}\n`,
  'utf8'
);
fs.writeFileSync(
  path.join(fragmentsDir, 'menus.json'),
  `${JSON.stringify(nextMenus, null, 2)}\n`,
  'utf8'
);

mergePackageContributes();

console.log('[sync-command-manifest] package-contributes/commands.json, menus.json を同期しました');
console.log(`[sync-command-manifest] commands: ${nextCommands.length} 件`);
const menuKeys = Object.keys(nextMenus);
console.log(`[sync-command-manifest] menus キー: ${menuKeys.join(', ')}`);
for (const key of menuKeys) {
  console.log(`[sync-command-manifest] menus["${key}"]: ${(nextMenus[key] || []).length} 件`);
}
