#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const schemaPath = path.join(repoRoot, 'schemas', 'schema.json');
const navigationSchemaPath = path.join(repoRoot, 'schemas', 'navigation-schema.json');
const templateSchemaPath = path.join(repoRoot, 'schemas', 'template-schema.json');

function normalizeForCompare(s) {
  return String(s).replace(/\r\n/g, '\n').trimEnd();
}

function readJson(p) {
  if (!fs.existsSync(p)) {
    throw new Error(`required schema file is missing: ${p}`);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function stringifyJson(json) {
  return JSON.stringify(json, null, 2) + '\n';
}

function assertSameJson(label, actual, expected, filePath) {
  if (normalizeForCompare(stringifyJson(actual)) === normalizeForCompare(stringifyJson(expected))) {
    return;
  }

  throw new Error(
    `[check-generated-schema-chain] ${label} is out of date: ${path.relative(repoRoot, filePath)}. ` +
      'Run `npm run compile` to regenerate schema artifacts.'
  );
}

function buildExpectedTemplateSchema(schema) {
  return {
    ...schema,
    type: 'array',
    items: schema.definitions?.componentArray?.items ?? schema.definitions?.component
  };
}

function main() {
  const { applyExpectedComponentOneOf } = require(path.join(
    repoRoot,
    'out',
    'services',
    'schema',
    'schema-component-oneof-builder.js'
  ));
  const { validateSchemaConsistency } = require(path.join(
    repoRoot,
    'out',
    'services',
    'schema',
    'schema-consistency-checker.js'
  ));

  const currentSchema = readJson(schemaPath);
  readJson(navigationSchemaPath);
  const currentTemplateSchema = readJson(templateSchemaPath);

  const expectedSchema = JSON.parse(JSON.stringify(currentSchema));
  applyExpectedComponentOneOf(expectedSchema);
  validateSchemaConsistency(expectedSchema);

  const expectedTemplateSchema = buildExpectedTemplateSchema(expectedSchema);

  assertSameJson('schema.json', currentSchema, expectedSchema, schemaPath);
  assertSameJson('template-schema.json', currentTemplateSchema, expectedTemplateSchema, templateSchemaPath);

  console.log('[check-generated-schema-chain] PASS schema.json, navigation-schema.json, and template-schema.json match compile-time expectations');
}

main();
