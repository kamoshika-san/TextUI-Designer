#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const YAML = require('yaml');
const Ajv = require('ajv');
const os = require('os');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const sampleRoot = path.join(repoRoot, 'sample');
const cliPath = path.join(repoRoot, 'out/cli/index.js');

const expectedFailureCases = [
  {
    file: 'sample/04-include-cyclic/cycle-test.tui.yml',
    reason: '循環参照の検証用サンプルのため、読み込み失敗が期待値'
  }
];

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolveSchemaForFile(relativePath) {
  if (relativePath.endsWith('.template.yml') || relativePath.endsWith('.template.yaml')) {
    return 'schema.json';
  }

  const baseName = path.basename(relativePath);
  if (/theme\.ya?ml$/i.test(baseName) || /[-_]theme\.ya?ml$/i.test(baseName)) {
    return 'theme-schema.json';
  }

  return 'schema.json';
}

function normalizeDocumentForSchema(relativePath, parsed) {
  if (relativePath.endsWith('.template.yml') || relativePath.endsWith('.template.yaml')) {
    // テンプレートは components 配列としてメインスキーマで検証する
    return { components: parsed };
  }

  return parsed;
}

function parseYamlFile(filePath, options = {}) {
  const { resolveIncludes: shouldResolveIncludes = true, includeStack = new Set() } = options;
  const normalizedPath = path.resolve(filePath);
  if (shouldResolveIncludes && includeStack.has(normalizedPath)) {
    throw new Error(`循環参照を検出しました: ${[...includeStack, normalizedPath].join(' -> ')}`);
  }

  if (shouldResolveIncludes) {
    includeStack.add(normalizedPath);
  }

  const raw = fs.readFileSync(normalizedPath, 'utf8');
  const parsed = YAML.parse(raw);

  if (!shouldResolveIncludes) {
    return parsed;
  }

  const resolved = resolveIncludes(parsed, normalizedPath, includeStack);
  includeStack.delete(normalizedPath);

  return resolved;
}

function resolveIncludes(node, currentFilePath, includeStack) {
  if (Array.isArray(node)) {
    const resolvedItems = [];

    for (const item of node) {
      if (isIncludeDirective(item)) {
        const included = loadInclude(item.$include, currentFilePath, includeStack);
        if (Array.isArray(included)) {
          resolvedItems.push(...included);
        } else {
          resolvedItems.push(included);
        }
      } else {
        resolvedItems.push(resolveIncludes(item, currentFilePath, includeStack));
      }
    }

    return resolvedItems;
  }

  if (node && typeof node === 'object') {
    const resolvedObject = {};
    for (const [key, value] of Object.entries(node)) {
      resolvedObject[key] = resolveIncludes(value, currentFilePath, includeStack);
    }
    return resolvedObject;
  }

  return node;
}

function isIncludeDirective(value) {
  return (
    value &&
    typeof value === 'object' &&
    value.$include &&
    typeof value.$include === 'object' &&
    typeof value.$include.template === 'string'
  );
}

function loadInclude(includeSpec, currentFilePath, includeStack) {
  const includePath = path.resolve(path.dirname(currentFilePath), includeSpec.template);
  const included = parseYamlFile(includePath, { resolveIncludes: true, includeStack });

  return applyIncludeParams(included, includeSpec.params || {});
}

function applyIncludeParams(node, params) {
  if (typeof node === 'string') {
    return node.replace(/\{\{\s*\$params\.([\w.]+)\s*\}\}/g, (_match, expression) => {
      const resolved = expression.split('.').reduce((acc, key) => {
        if (!acc || typeof acc !== 'object') {
          return undefined;
        }
        return acc[key];
      }, params);

      return resolved === undefined || resolved === null ? '' : String(resolved);
    });
  }

  if (Array.isArray(node)) {
    return node.map(item => applyIncludeParams(item, params));
  }

  if (node && typeof node === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(node)) {
      result[key] = applyIncludeParams(value, params);
    }
    return result;
  }

  return node;
}

function validateAllSamples() {
  const ajv = new Ajv({ allErrors: true, strict: false, addUsedSchema: false });
  const schemaValidators = new Map();

  const sampleFiles = globSync('sample/**/*.y?(a)ml', {
    cwd: repoRoot,
    nodir: true,
    ignore: ['**/node_modules/**']
  }).sort();

  if (sampleFiles.length === 0) {
    throw new Error('sample配下にYAMLファイルが見つかりませんでした。');
  }

  const failures = [];
  const expectedFailures = new Set(expectedFailureCases.map(entry => entry.file));

  for (const relativePath of sampleFiles) {
    try {
      const shouldResolveIncludes = /\.tui\.ya?ml$/i.test(relativePath);
      const parsed = parseYamlFile(path.join(repoRoot, relativePath), { resolveIncludes: shouldResolveIncludes });
      const normalized = normalizeDocumentForSchema(relativePath, parsed);
      const schemaName = resolveSchemaForFile(relativePath);
      let validate = schemaValidators.get(schemaName);

      if (!validate) {
        const schema = loadJson(path.join(repoRoot, 'schemas', schemaName));
        validate = ajv.compile(schema);
        schemaValidators.set(schemaName, validate);
      }

      const valid = validate(normalized);
      if (!valid) {
        const details = (validate.errors || []).map(error => `${error.instancePath || '/'} ${error.message || ''}`.trim());
        throw new Error(`スキーマ違反: ${details.join(' | ')}`);
      }

      if (expectedFailures.has(relativePath)) {
        throw new Error('失敗を期待するサンプルが成功しました。');
      }

      console.log(`✅ validated: ${relativePath}`);
    } catch (error) {
      const expected = expectedFailureCases.find(entry => entry.file === relativePath);
      if (expected) {
        console.log(`✅ expected failure: ${relativePath} (${expected.reason})`);
        continue;
      }

      failures.push(`❌ ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const uncoveredExpected = expectedFailureCases.filter(entry => !sampleFiles.includes(entry.file));
  for (const missing of uncoveredExpected) {
    failures.push(`❌ expected failure case not found: ${missing.file}`);
  }

  if (failures.length > 0) {
    throw new Error(`サンプル検証に失敗しました:\n${failures.join('\n')}`);
  }
}

async function validateRepresentativeExports() {
  const { HtmlExporter } = require(path.join(repoRoot, 'out/exporters/html-exporter.js'));

  const representativeSamples = [
    'sample/01-basic/sample.tui.yml',
    'sample/02-theme/theme-demo.tui.yml',
    'sample/03-include/include-sample.tui.yml',
    'sample/05-theme-inheritance/inheritance-demo.tui.yml',
    'sample/06-token/token-demo.tui.yml'
  ];

  for (const sampleFile of representativeSamples) {
    const dsl = parseYamlFile(path.join(repoRoot, sampleFile), { resolveIncludes: true });
    const html = await new HtmlExporter().export(dsl, { format: 'html' });

    if (typeof html !== 'string' || !html.includes('<!DOCTYPE html>') || !html.includes('<body')) {
      throw new Error(`エクスポート結果が不正です: ${sampleFile}`);
    }

    console.log(`✅ export verified: ${sampleFile}`);
  }
}

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

async function validateRepresentativeCliExports() {
  const sampleFile = path.join(repoRoot, 'sample/06-token/token-demo.tui.yml');
  const providers = [
    { name: 'html', extension: '.html' },
    { name: 'vue', extension: '.vue' },
    { name: 'svelte', extension: '.svelte' }
  ];
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-sample-gate-'));

  try {
    providers.forEach(provider => {
      const outputPath = path.join(tempDir, `token-demo${provider.extension}`);
      const result = runCli([
        'export',
        '--file', sampleFile,
        '--provider', provider.name,
        '--output', outputPath,
        '--deterministic',
        '--json'
      ]);

      if (result.status !== 0) {
        throw new Error(`CLI export failed (${provider.name}): ${result.stderr || result.stdout}`);
      }

      if (!fs.existsSync(outputPath)) {
        throw new Error(`CLI export output missing (${provider.name}): ${outputPath}`);
      }

      const parsed = JSON.parse(result.stdout || '{}');
      if (parsed.tokenWarnings && Number(parsed.tokenWarnings) > 0) {
        throw new Error(`CLI export has token warnings (${provider.name})`);
      }

      const output = fs.readFileSync(outputPath, 'utf8');
      if (provider.name === 'vue' && !output.includes('<template>')) {
        throw new Error('Vue exporter output is invalid');
      }
      if (provider.name === 'svelte' && !output.includes('<script lang="ts">')) {
        throw new Error('Svelte exporter output is invalid');
      }

      console.log(`✅ cli export verified: ${provider.name}`);
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function main() {
  validateAllSamples();
  await validateRepresentativeExports();
  await validateRepresentativeCliExports();
  console.log('🎉 sample quality gate passed.');
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
