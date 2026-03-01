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
const manifestCommands = pkg.contributes?.commands || [];
const manifestMenus = pkg.contributes?.menus?.['editor/title'] || [];

const catalogCommands = getPackageCommandContributions();
const catalogMenus = getPackageMenuContributions()['editor/title'] || [];

const normalize = (items) =>
  [...items]
    .map(item => JSON.stringify(item))
    .sort();

const commandDiffers = JSON.stringify(normalize(manifestCommands)) !== JSON.stringify(normalize(catalogCommands));
const menuDiffers = JSON.stringify(normalize(manifestMenus)) !== JSON.stringify(normalize(catalogMenus));

if (!commandDiffers && !menuDiffers) {
  console.log('[check-command-manifest] package.json は command-catalog と同期済みです');
  process.exit(0);
}

if (commandDiffers) {
  console.error('[check-command-manifest] contributes.commands が command-catalog と不一致です');
}
if (menuDiffers) {
  console.error('[check-command-manifest] contributes.menus["editor/title"] が command-catalog と不一致です');
}

console.error('[check-command-manifest] `npm run sync:commands` を実行して同期してください');
process.exit(1);
