const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const rendererRoot = path.join(repoRoot, 'src', 'renderer');
const rendererTypesFacadePath = path.join(rendererRoot, 'types.ts');
const rendererTypesImport = /from\s+['"][^'"]*renderer\/types(?:\.ts)?['"]/;

function walkSourceLikeFiles(dir, out = []) {
  if (!fs.existsSync(dir)) {
    return out;
  }
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkSourceLikeFiles(full, out);
    } else if (/\.(js|ts|tsx)$/.test(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

function toPosixRelative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function readOptionalFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf8');
}

function findRendererTypesImports(files) {
  const violations = [];
  for (const filePath of files) {
    const text = fs.readFileSync(filePath, 'utf8');
    if (rendererTypesImport.test(text)) {
      violations.push(toPosixRelative(filePath));
    }
  }
  return violations;
}

module.exports = {
  findRendererTypesImports,
  readOptionalFile,
  rendererRoot,
  rendererTypesFacadePath,
  rendererTypesImport,
  repoRoot,
  toPosixRelative,
  walkSourceLikeFiles,
};
