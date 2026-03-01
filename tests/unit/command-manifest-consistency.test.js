const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('コマンド定義整合性', () => {
  const workspaceRoot = path.resolve(__dirname, '../..');
  const packageJsonPath = path.join(workspaceRoot, 'package.json');
  const commandCatalogPath = path.join(workspaceRoot, 'out/services/command-catalog.js');

  const readManifestCommands = () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return (pkg.contributes?.commands || []).map(command => command.command);
  };

  const readRegisteredCommands = () => {
    const { TEXTUI_COMMAND_IDS } = require(commandCatalogPath);
    return [...TEXTUI_COMMAND_IDS];
  };

  it('CommandManagerで登録するコマンドはすべてmanifestに存在する', () => {
    const manifestCommands = new Set(readManifestCommands());
    const registeredCommands = readRegisteredCommands();

    const missingInManifest = registeredCommands.filter(command => !manifestCommands.has(command));
    assert.deepStrictEqual(
      missingInManifest,
      [],
      `manifest未定義のコマンドがあります: ${missingInManifest.join(', ')}`
    );
  });

  it('manifestで公開するコマンドはすべてCommandManagerで登録される', () => {
    const registeredCommands = new Set(readRegisteredCommands());
    const manifestCommands = readManifestCommands();

    const missingInManager = manifestCommands.filter(command => !registeredCommands.has(command));
    assert.deepStrictEqual(
      missingInManager,
      [],
      `CommandManager未登録のmanifestコマンドがあります: ${missingInManager.join(', ')}`
    );
  });
});
