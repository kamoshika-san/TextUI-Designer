#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const srcDir = path.join(repoRoot, 'src');
const testsDir = path.join(repoRoot, 'tests');
const rendererRoot = path.join(srcDir, 'renderer');

const reRendererTypesImport = /from\s+['"][^'"]*renderer\/types['"]/g;
const reDomainDslTypesImport = /from\s+['"][^'"]*domain\/dsl-types['"]/g;

function walkTsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) {
    return out;
  }
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkTsFiles(p, out);
    } else if (/\.(ts|tsx|js)$/.test(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

function toPosixRelative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function countMatches(text, regex) {
  return [...text.matchAll(regex)].length;
}

const files = [...walkTsFiles(srcDir), ...walkTsFiles(testsDir)];
const rendererTypesImports = [];
const domainDslTypesImports = [];
const violations = [];

for (const abs of files) {
  const rel = toPosixRelative(abs);
  const text = fs.readFileSync(abs, 'utf8');
  const rendererCount = countMatches(text, reRendererTypesImport);
  const domainCount = countMatches(text, reDomainDslTypesImport);
  const isRendererFile = abs.startsWith(rendererRoot + path.sep) || abs === rendererRoot;

  if (rendererCount > 0) {
    rendererTypesImports.push({ file: rel, count: rendererCount, allowed: isRendererFile });
    if (!isRendererFile) {
      violations.push(`${rel}: renderer/types import が残存（共有 DSL 型は domain/dsl-types を参照してください）`);
    }
  }

  if (domainCount > 0) {
    domainDslTypesImports.push({ file: rel, count: domainCount });
  }
}

console.log('DSL type import inventory');
console.log(`- domain/dsl-types imports: ${domainDslTypesImports.reduce((sum, x) => sum + x.count, 0)}`);
console.log(`- renderer/types imports: ${rendererTypesImports.reduce((sum, x) => sum + x.count, 0)}`);

if (domainDslTypesImports.length > 0) {
  console.log('\nFiles importing domain/dsl-types:');
  for (const entry of domainDslTypesImports) {
    console.log(`  - ${entry.file} (${entry.count})`);
  }
}

if (rendererTypesImports.length > 0) {
  console.log('\nFiles importing renderer/types:');
  for (const entry of rendererTypesImports) {
    const suffix = entry.allowed ? 'allowed (renderer only)' : 'VIOLATION';
    console.log(`  - ${entry.file} (${entry.count}) ${suffix}`);
  }
}

if (violations.length > 0) {
  console.error('\nSSoT violation(s) detected:');
  for (const violation of violations) {
    console.error(`  - ${violation}`);
  }
  process.exit(1);
}

