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
const actual = pkg?.contributes?.configuration;

if (!actual || typeof actual !== 'object') {
  throw new Error('package.json の contributes.configuration が見つかりません');
}

const expected = getGeneratedContributesConfiguration();
const actualRaw = JSON.stringify(actual);
const expectedRaw = JSON.stringify(expected);

if (actualRaw !== expectedRaw) {
  console.error('[check-contributes-configuration] package.json の contributes.configuration が定義ソースと不一致です');
  console.error('修正方法: npm run sync:configuration');
  process.exit(1);
}

console.log('[check-contributes-configuration] package.json は contributes.configuration 全体が定義ソースと同期済みです');
console.log(`[check-contributes-configuration] properties: ${Object.keys(expected.properties).length} 件`);

