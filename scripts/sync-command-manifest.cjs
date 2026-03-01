const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(workspaceRoot, 'package.json');
const commandCatalogPath = path.join(workspaceRoot, 'out', 'services', 'command-catalog.js');

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

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const contributes = pkg.contributes || {};
const nextCommands = getPackageCommandContributions();
const nextMenusFromCatalog = getPackageMenuContributions();

const existingMenus = contributes.menus || {};
const nextMenus = {
  ...existingMenus,
  'editor/title': nextMenusFromCatalog['editor/title']
};

pkg.contributes = {
  ...contributes,
  commands: nextCommands,
  menus: nextMenus
};

fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

console.log('[sync-command-manifest] package.json を command-catalog から同期しました');
console.log(`[sync-command-manifest] commands: ${nextCommands.length} 件`);
console.log(`[sync-command-manifest] editor/title menus: ${nextMenus['editor/title'].length} 件`);
