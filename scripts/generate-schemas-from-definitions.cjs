#!/usr/bin/env node
/**
 * `npm run compile` の最終段で実行。descriptor（COMPONENT_DEFINITIONS）由来の
 * `definitions.component.oneOf` を `schema-component-oneof-builder` 経由で `schemas/schema.json` に書き戻し、
 * `template-schema.json` をメインスキーマから再生成する。正規フローは docs/schema-pipeline-from-spec.md。
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const schemaPath = path.join(repoRoot, 'schemas', 'schema.json');
const templateSchemaPath = path.join(repoRoot, 'schemas', 'template-schema.json');

function normalizeForCompare(s) {
  return String(s).replace(/\r\n/g, '\n').trimEnd();
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJsonIfChanged(p, json) {
  const nextRaw = JSON.stringify(json, null, 2) + '\n';
  const currentRaw = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  if (normalizeForCompare(nextRaw) === normalizeForCompare(currentRaw)) {
    return false;
  }
  fs.writeFileSync(p, nextRaw, 'utf8');
  return true;
}

function main() {
  // compile 後に out/ が生成される前提
  const { applyExpectedComponentOneOf } = require(path.join(repoRoot, 'out', 'services', 'schema', 'schema-component-oneof-builder.js'));
  const { validateSchemaConsistency } = require(path.join(repoRoot, 'out', 'services', 'schema', 'schema-consistency-checker.js'));

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`schema.json が見つかりません: ${schemaPath}`);
  }

  const schema = readJson(schemaPath);
  applyExpectedComponentOneOf(schema);

  validateSchemaConsistency(schema);

  // SchemaManager.createTemplateSchema() と同ロジックで再生成
  const templateSchema = {
    ...schema,
    type: 'array',
    items: schema.definitions?.componentArray?.items ?? schema.definitions?.component
  };

  const wroteSchema = writeJsonIfChanged(schemaPath, schema);
  const wroteTemplate = writeJsonIfChanged(templateSchemaPath, templateSchema);

  console.log(
    `[generate-schemas-from-definitions] schema.json=${wroteSchema ? 'updated' : 'unchanged'}, template-schema.json=${wroteTemplate ? 'updated' : 'unchanged'}`
  );
}

main();

