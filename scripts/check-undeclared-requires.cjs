/**
 * Fail when require('pkg') in src TypeScript sources uses a package name that is not
 * declared in package.json dependencies or devDependencies (or optionalDependencies),
 * excluding Node builtins and the small allowlist below (T-20260421-032).
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { builtinModules } = require('module');

const REPO_ROOT = path.resolve(__dirname, '..');
const SRC_ROOT = path.join(REPO_ROOT, 'src');

/** VS Code extension host injects this module; it is not an npm dependency. */
const ALLOW = new Set(['vscode']);

const BUILTIN = new Set(
  builtinModules.flatMap((m) => [m, `node:${m}`])
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function declaredPackages(pkg) {
  const names = new Set();
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    const block = pkg[section];
    if (block && typeof block === 'object') {
      for (const name of Object.keys(block)) {
        names.add(name);
      }
    }
  }
  return names;
}

function walkTsFiles(dir, out) {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkTsFiles(full, out);
    } else if (ent.isFile() && ent.name.endsWith('.ts')) {
      out.push(full);
    }
  }
}

function extractRequires(source) {
  const reqs = [];
  const re = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    reqs.push(m[1]);
  }
  return reqs;
}

function main() {
  const pkg = readJson(path.join(REPO_ROOT, 'package.json'));
  const declared = declaredPackages(pkg);
  const files = [];
  walkTsFiles(SRC_ROOT, files);

  const violations = [];

  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    for (const spec of extractRequires(code)) {
      if (spec.startsWith('.') || spec.startsWith('/')) {
        continue;
      }
      const name = spec.startsWith('node:') ? spec.slice('node:'.length) : spec;
      if (BUILTIN.has(spec) || BUILTIN.has(name)) {
        continue;
      }
      if (ALLOW.has(name)) {
        continue;
      }
      if (declared.has(name)) {
        continue;
      }
      violations.push({ file: path.relative(REPO_ROOT, file), spec });
    }
  }

  if (violations.length) {
    console.error('Undeclared require() packages in src/:');
    for (const v of violations) {
      console.error(`  ${v.file}: require('${v.spec}')`);
    }
    console.error(
      '\nFix: add to package.json dependencies/devDependencies, or extend ALLOW in scripts/check-undeclared-requires.cjs with documented rationale.'
    );
    process.exit(1);
  }
  console.log('check-undeclared-requires: OK (src/**/*.ts)');
}

main();
