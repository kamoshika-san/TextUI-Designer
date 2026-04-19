#!/usr/bin/env node
/**
 * T-003: Assemble `package.json` → `contributes` from `package-contributes/*.json` fragments.
 * Do not hand-edit `package.json` contributes; edit fragments (or run sync:* generators) then merge.
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
const fragmentsDir = path.join(workspaceRoot, 'package-contributes');
const packageJsonPath = path.join(workspaceRoot, 'package.json');

function readFragment(name) {
  const p = path.join(fragmentsDir, name);
  if (!fs.existsSync(p)) {
    throw new Error(`[merge-package-contributes] missing fragment: ${name} (${p})`);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function mergePackageContributes() {
  const configuration = readFragment('configuration.json');
  const commands = readFragment('commands.json');
  const menus = readFragment('menus.json');
  const langSnip = readFragment('languages-snippets.json');
  const schemas = readFragment('schemas.json');

  if (!Array.isArray(commands)) {
    throw new Error('[merge-package-contributes] commands.json must be a JSON array');
  }
  if (!menus || typeof menus !== 'object' || Array.isArray(menus)) {
    throw new Error('[merge-package-contributes] menus.json must be a JSON object');
  }
  if (!langSnip || typeof langSnip !== 'object') {
    throw new Error('[merge-package-contributes] languages-snippets.json must be a JSON object');
  }
  if (!schemas || typeof schemas !== 'object') {
    throw new Error('[merge-package-contributes] schemas.json must be a JSON object');
  }

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  pkg.contributes = {
    configuration,
    commands,
    languages: langSnip.languages,
    menus,
    snippets: langSnip.snippets,
    'yaml.schemas': schemas['yaml.schemas'],
    jsonValidation: schemas.jsonValidation
  };

  fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  console.log('[merge-package-contributes] wrote package.json contributes from package-contributes/*.json');
}

function main() {
  mergePackageContributes();
}

if (require.main === module) {
  main();
}

module.exports = { mergePackageContributes };
