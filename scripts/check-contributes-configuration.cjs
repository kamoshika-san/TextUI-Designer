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

const { getGeneratedConfigurationProperties } = require(builtConfigurationPath);
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const actual = pkg?.contributes?.configuration?.properties;

if (!actual || typeof actual !== 'object') {
  throw new Error('package.json の contributes.configuration.properties が見つかりません');
}

const expected = getGeneratedConfigurationProperties();
const actualRaw = JSON.stringify(actual);
const expectedRaw = JSON.stringify(expected);

if (actualRaw !== expectedRaw) {
  console.error('[check-contributes-configuration] package.json の configuration が定義ソースと不一致です');
  console.error('修正方法: npm run sync:configuration');
  process.exit(1);
}

console.log('[check-contributes-configuration] package.json は configuration 定義と同期済みです');
console.log(`[check-contributes-configuration] properties: ${Object.keys(expected).length} 件`);

