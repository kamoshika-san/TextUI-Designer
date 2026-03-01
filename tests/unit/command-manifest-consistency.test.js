const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('コマンド定義整合性', () => {
  const workspaceRoot = path.resolve(__dirname, '../..');
  const packageJsonPath = path.join(workspaceRoot, 'package.json');
  const commandCatalogPath = path.join(workspaceRoot, 'out/services/command-catalog.js');

  const readManifestCommands = () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return pkg.contributes?.commands || [];
  };

  const readManifestMenus = () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return pkg.contributes?.menus?.['editor/title'] || [];
  };

  const readCatalogContributions = () => {
    const { getPackageCommandContributions, getPackageMenuContributions } = require(commandCatalogPath);
    return {
      commands: getPackageCommandContributions(),
      menus: getPackageMenuContributions()['editor/title'] || []
    };
  };

  const normalizeCommands = commands =>
    [...commands].sort((a, b) => a.command.localeCompare(b.command));

  const normalizeMenus = menus =>
    [...menus].sort((a, b) => a.command.localeCompare(b.command));

  it('manifestで公開するcommands定義はcommand-catalogと一致する', () => {
    const manifestCommands = normalizeCommands(readManifestCommands());
    const catalogCommands = normalizeCommands(readCatalogContributions().commands);

    assert.deepStrictEqual(
      manifestCommands,
      catalogCommands,
      'manifest commands が command-catalog と一致しません'
    );
  });

  it('manifestで公開するeditor/titleメニュー定義はcommand-catalogと一致する', () => {
    const manifestMenus = normalizeMenus(readManifestMenus());
    const catalogMenus = normalizeMenus(readCatalogContributions().menus);

    assert.deepStrictEqual(
      manifestMenus,
      catalogMenus,
      'manifest menus[editor/title] が command-catalog と一致しません'
    );
  });
});
