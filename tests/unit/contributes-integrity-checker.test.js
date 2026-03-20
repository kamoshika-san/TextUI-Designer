const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { validateContributesIntegrity } = require('../../scripts/check-contributes-integrity.cjs');

describe('check-contributes-integrity', () => {
  const workspaceRoot = path.resolve(__dirname, '../..');
  const packageJsonPath = path.join(workspaceRoot, 'package.json');

  function readPackageJson() {
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  }

  it('現行 package.json では整合性エラーが発生しない', () => {
    const pkg = readPackageJson();
    const errors = validateContributesIntegrity(pkg, workspaceRoot);
    assert.deepStrictEqual(errors, []);
  });

  it('menus が未定義コマンドを参照している場合に検知する', () => {
    const pkg = readPackageJson();
    pkg.contributes.menus['editor/title'] = [
      ...(pkg.contributes.menus['editor/title'] || []),
      {
        command: 'textui-designer.not-found-command',
        when: 'resourceLangId == yaml',
        group: 'navigation'
      }
    ];

    const errors = validateContributesIntegrity(pkg, workspaceRoot);
    assert.ok(errors.some(error => error.includes('not-found-command')));
  });

  it('snippets path の欠落を検知する', () => {
    const pkg = readPackageJson();
    pkg.contributes.snippets = [
      {
        language: 'yaml',
        path: './snippets/not-exists.json'
      }
    ];

    const errors = validateContributesIntegrity(pkg, workspaceRoot);
    assert.ok(errors.some(error => error.includes('not-exists.json')));
  });

  it('yaml.schemas の対象glob欠落を検知する', () => {
    const pkg = readPackageJson();
    pkg.contributes['yaml.schemas'] = {
      './schemas/schema.json': []
    };

    const errors = validateContributesIntegrity(pkg, workspaceRoot);
    assert.ok(errors.some(error => error.includes('対象globが空')));
  });
});
