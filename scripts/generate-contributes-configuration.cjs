#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(workspaceRoot, 'package.json');
const builtConfigurationPath = path.join(workspaceRoot, 'out', 'config', 'configuration-properties.js');
const fragmentsDir = path.join(workspaceRoot, 'package-contributes');

if (!fs.existsSync(builtConfigurationPath)) {
  throw new Error(
    `configuration 定義のビルド成果物が見つかりません: ${builtConfigurationPath}\n` +
    '先に `npm run compile` を実行してください。'
  );
}

const { mergePackageContributes } = require('./merge-package-contributes.cjs');

const { getGeneratedContributesConfiguration } = require(builtConfigurationPath);

if (!fs.existsSync(packageJsonPath)) {
  throw new Error(`package.json が見つかりません: ${packageJsonPath}`);
}

const nextConfiguration = getGeneratedContributesConfiguration();

fs.mkdirSync(fragmentsDir, { recursive: true });
fs.writeFileSync(
  path.join(fragmentsDir, 'configuration.json'),
  `${JSON.stringify(nextConfiguration, null, 2)}\n`,
  'utf8'
);

mergePackageContributes();

console.log('[generate-contributes-configuration] package-contributes/configuration.json を同期しました');
console.log(`[generate-contributes-configuration] properties: ${Object.keys(nextConfiguration.properties).length} 件`);
