#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function normalizeContributesEntries(entries) {
  if (!entries || typeof entries !== 'object') {
    return [];
  }
  return Object.entries(entries);
}

function validateContributesIntegrity(pkg, workspaceRoot) {
  const errors = [];
  const contributes = pkg?.contributes;
  const commands = contributes?.commands || [];
  const menus = contributes?.menus || {};
  const snippets = contributes?.snippets || [];
  const yamlSchemas = contributes?.['yaml.schemas'];

  if (!Array.isArray(commands)) {
    errors.push('contributes.commands が配列ではありません');
  }

  const commandIds = new Set(
    (Array.isArray(commands) ? commands : [])
      .map(command => command?.command)
      .filter(command => typeof command === 'string' && command.length > 0)
  );

  if (menus && typeof menus === 'object') {
    Object.entries(menus).forEach(([menuName, menuItems]) => {
      if (!Array.isArray(menuItems)) {
        errors.push(`contributes.menus["${menuName}"] が配列ではありません`);
        return;
      }
      menuItems.forEach((item, index) => {
        const command = item?.command;
        if (!command) {
          return;
        }
        if (!commandIds.has(command)) {
          errors.push(`contributes.menus["${menuName}"][${index}] の command "${command}" が contributes.commands に存在しません`);
        }
      });
    });
  }

  if (!Array.isArray(snippets)) {
    errors.push('contributes.snippets が配列ではありません');
  } else {
    snippets.forEach((snippet, index) => {
      const snippetPath = snippet?.path;
      if (typeof snippetPath !== 'string' || snippetPath.length === 0) {
        errors.push(`contributes.snippets[${index}].path が不正です`);
        return;
      }
      const absolutePath = path.resolve(workspaceRoot, snippetPath);
      if (!fs.existsSync(absolutePath)) {
        errors.push(`contributes.snippets[${index}].path の参照先が存在しません: ${snippetPath}`);
      }
    });
  }

  const yamlSchemaEntries = normalizeContributesEntries(yamlSchemas);
  if (yamlSchemaEntries.length === 0) {
    errors.push('contributes["yaml.schemas"] が未定義または空です');
  } else {
    yamlSchemaEntries.forEach(([schemaPath, globs]) => {
      const absoluteSchemaPath = path.resolve(workspaceRoot, schemaPath);
      if (!fs.existsSync(absoluteSchemaPath)) {
        errors.push(`contributes["yaml.schemas"] の schema が存在しません: ${schemaPath}`);
      }
      if (!Array.isArray(globs) || globs.length === 0) {
        errors.push(`contributes["yaml.schemas"]["${schemaPath}"] の対象globが空です`);
      }
    });
  }

  return errors;
}

function main() {
  const workspaceRoot = path.resolve(__dirname, '..');
  const packageJsonPath = path.join(workspaceRoot, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const errors = validateContributesIntegrity(pkg, workspaceRoot);

  if (errors.length > 0) {
    console.error('[check-contributes-integrity] contributes 整合性チェックに失敗しました');
    errors.forEach(error => {
      console.error(`- ${error}`);
    });
    process.exit(1);
  }

  console.log('[check-contributes-integrity] package.json contributes の整合性は正常です');
}

if (require.main === module) {
  main();
}

module.exports = {
  validateContributesIntegrity
};
