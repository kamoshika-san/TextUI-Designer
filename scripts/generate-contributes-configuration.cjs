#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(workspaceRoot, 'package.json');
const builtConfigurationPath = path.join(workspaceRoot, 'out', 'config', 'configuration-properties.js');

if (!fs.existsSync(builtConfigurationPath)) {
  throw new Error(
    `configuration 定義のビルド成果物が見つかりません: ${builtConfigurationPath}\n` +
    '先に `npm run compile` を実行してください。'
  );
}

const { getGeneratedContributesConfiguration } = require(builtConfigurationPath);
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (!pkg.contributes) {
  throw new Error('package.json に contributes が見つかりません');
}

const nextConfiguration = getGeneratedContributesConfiguration();
pkg.contributes.configuration = nextConfiguration;

fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

console.log('[generate-contributes-configuration] package.json の contributes.configuration を同期しました');
console.log(`[generate-contributes-configuration] properties: ${Object.keys(nextConfiguration.properties).length} 件`);

