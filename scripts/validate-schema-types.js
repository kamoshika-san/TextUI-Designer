#!/usr/bin/env node
/**
 * スキーマ/型定義の整合性検証スクリプト
 *
 * schemas/schema.json の component 定義と
 * src/registry/component-registry.ts の BUILT_IN_COMPONENTS、
 * src/renderer/types.ts の ComponentDef ユニオンが一致しているかを検証する。
 *
 * 使用方法: node scripts/validate-schema-types.js
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, '..', 'schemas', 'schema.json');
const TYPES_PATH = path.join(__dirname, '..', 'src', 'renderer', 'types.ts');
const REGISTRY_PATH = path.join(__dirname, '..', 'src', 'registry', 'component-registry.ts');

let hasErrors = false;

function error(msg) {
  console.error(`❌ ${msg}`);
  hasErrors = true;
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function warn(msg) {
  console.log(`⚠️  ${msg}`);
}

// 1. schema.json からコンポーネント名を抽出
function getSchemaComponents() {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
  const componentDef = schema.definitions?.component;
  if (!componentDef || !componentDef.oneOf) {
    error('schema.json に definitions.component.oneOf が見つかりません');
    return [];
  }

  return componentDef.oneOf.map(ref => {
    const refPath = ref['$ref'];
    // "#/definitions/Text" -> "Text"
    return refPath.split('/').pop();
  }).sort();
}

// 2. types.ts の ComponentDef ユニオンからコンポーネント名を抽出
function getTypesComponents() {
  const content = fs.readFileSync(TYPES_PATH, 'utf-8');

  // "export type ComponentDef =" 以降の行から { Xxx: ... } パターンを抽出
  const componentDefMatch = content.match(/export type ComponentDef\s*=\s*([\s\S]*?);/);
  if (!componentDefMatch) {
    error('types.ts に ComponentDef 型定義が見つかりません');
    return [];
  }

  const componentDefBlock = componentDefMatch[1];
  const names = [];
  const re = /\{\s*(\w+)\s*:/g;
  let m;
  while ((m = re.exec(componentDefBlock)) !== null) {
    names.push(m[1]);
  }
  return names.sort();
}

// 3. component-registry.ts の BUILT_IN_COMPONENTS から名前を抽出
function getRegistryComponents() {
  const content = fs.readFileSync(REGISTRY_PATH, 'utf-8');

  const match = content.match(/BUILT_IN_COMPONENTS\s*=\s*\[([\s\S]*?)\]/);
  if (!match) {
    error('component-registry.ts に BUILT_IN_COMPONENTS が見つかりません');
    return [];
  }

  const names = [];
  const re = /'(\w+)'/g;
  let m;
  while ((m = re.exec(match[1])) !== null) {
    names.push(m[1]);
  }
  return names.sort();
}

// 4. FormField のフィールドを取得
function getFormFieldComponents() {
  const content = fs.readFileSync(TYPES_PATH, 'utf-8');

  const formFieldMatch = content.match(/export interface FormField\s*\{([\s\S]*?)\}/);
  if (!formFieldMatch) {
    error('types.ts に FormField インターフェースが見つかりません');
    return [];
  }

  const names = [];
  const re = /(\w+)\??\s*:/g;
  let m;
  while ((m = re.exec(formFieldMatch[1])) !== null) {
    names.push(m[1]);
  }
  return names.sort();
}

// メイン検証
console.log('=== TextUI Designer: スキーマ/型 整合性検証 ===\n');

const schemaComponents = getSchemaComponents();
const typesComponents = getTypesComponents();
const registryComponents = getRegistryComponents();
const formFieldComponents = getFormFieldComponents();

console.log(`Schema (schema.json):       [${schemaComponents.join(', ')}]`);
console.log(`Types (ComponentDef):        [${typesComponents.join(', ')}]`);
console.log(`Registry (BUILT_IN):         [${registryComponents.join(', ')}]`);
console.log(`FormField:                   [${formFieldComponents.join(', ')}]\n`);

// Schema ↔ ComponentDef の比較
const inSchemaNotTypes = schemaComponents.filter(c => !typesComponents.includes(c));
const inTypesNotSchema = typesComponents.filter(c => !schemaComponents.includes(c));

if (inSchemaNotTypes.length > 0) {
  error(`Schema にあるが ComponentDef にないコンポーネント: ${inSchemaNotTypes.join(', ')}`);
}
if (inTypesNotSchema.length > 0) {
  error(`ComponentDef にあるが Schema にないコンポーネント: ${inTypesNotSchema.join(', ')}`);
}
if (inSchemaNotTypes.length === 0 && inTypesNotSchema.length === 0) {
  ok('Schema ↔ ComponentDef: 完全一致');
}

// Schema ↔ Registry の比較
const inSchemaNotRegistry = schemaComponents.filter(c => !registryComponents.includes(c));
const inRegistryNotSchema = registryComponents.filter(c => !schemaComponents.includes(c));

if (inSchemaNotRegistry.length > 0) {
  error(`Schema にあるが BUILT_IN_COMPONENTS にないコンポーネント: ${inSchemaNotRegistry.join(', ')}`);
}
if (inRegistryNotSchema.length > 0) {
  error(`BUILT_IN_COMPONENTS にあるが Schema にないコンポーネント: ${inRegistryNotSchema.join(', ')}`);
}
if (inSchemaNotRegistry.length === 0 && inRegistryNotSchema.length === 0) {
  ok('Schema ↔ BUILT_IN_COMPONENTS: 完全一致');
}

// FormField がサポートすべきコンポーネント（Form以外の全コンポーネント）のチェック
const expectedFormFieldComponents = schemaComponents.filter(c => c !== 'Form');
const missingInFormField = expectedFormFieldComponents.filter(c => !formFieldComponents.includes(c));
if (missingInFormField.length > 0) {
  warn(`FormField に定義されていないコンポーネント: ${missingInFormField.join(', ')} (Button はフォームでは FormAction 側で管理)`);
}

console.log('');
if (hasErrors) {
  console.error('検証失敗: 上記のエラーを修正してください。');
  process.exit(1);
} else {
  console.log('検証成功: すべてのコンポーネント定義が一致しています。');
  process.exit(0);
}
