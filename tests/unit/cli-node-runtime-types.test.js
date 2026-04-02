const assert = require('assert');
const path = require('path');
const ts = require('typescript');

function loadProjectCompilerOptions() {
  const repoRoot = path.resolve(__dirname, '../..');
  const configPath = path.join(repoRoot, 'tsconfig.json');
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
  }

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, repoRoot);
  return {
    ...parsed.options,
    noEmit: true,
    rootDir: undefined,
    outDir: undefined
  };
}

describe('CLI project config Node runtime types', () => {
  it('provides typings for process and core node modules used by src/cli', () => {
    const compilerOptions = loadProjectCompilerOptions();
    const containingFile = path.join(__dirname, '../../src/cli/node-runtime-types-smoke.ts');

    assert.deepStrictEqual(compilerOptions.types, ['node']);

    const nodeType = ts.resolveTypeReferenceDirective(
      'node',
      containingFile,
      compilerOptions,
      ts.sys
    );
    assert.ok(nodeType.resolvedTypeReferenceDirective);
  });
});
