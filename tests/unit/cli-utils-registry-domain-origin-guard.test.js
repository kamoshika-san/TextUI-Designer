/**
 * T-20260322-151:
 * CLI / Utils / Registry レイヤで shared DSL 型を使う場合の import 起点を
 * domain/dsl-types に固定する（renderer/types への逆流を禁止）。
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const targets = ['src/cli', 'src/utils', 'src/registry'];
const SHARED_TYPE_NAMES = [
  'TextUIDSL',
  'ComponentDef',
  'BaseComponent',
  'LayoutComponent',
  'FormComponent',
  'ButtonComponent',
  'InputComponent',
  'SelectComponent',
  'CheckboxComponent',
  'RadioComponent',
  'DatePickerComponent',
  'AlertComponent',
  'SpacerComponent',
  'TreeViewComponent',
  'TableComponent',
  'TabsComponent',
  'AccordionComponent',
  'ThemeToken',
];

function walkTsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkTsFiles(full, out);
      continue;
    }
    if (/\.(ts|tsx)$/.test(ent.name)) out.push(full);
  }
  return out;
}

function rel(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

describe('cli/utils/registry shared DSL import origin guard (T-20260322-151)', () => {
  it('shared DSL 型は domain/dsl-types から import される', () => {
    const violations = [];
    const sharedTypePattern = new RegExp(`\\b(${SHARED_TYPE_NAMES.join('|')})\\b`);
    const importLinePattern = /import\s+type\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;

    for (const dir of targets) {
      for (const file of walkTsFiles(path.join(repoRoot, dir))) {
        const code = fs.readFileSync(file, 'utf8');
        const fileRel = rel(file);

        let m;
        while ((m = importLinePattern.exec(code)) !== null) {
          const imported = m[1];
          const source = m[2];
          if (!sharedTypePattern.test(imported)) continue;

          const isDomainOrigin = /domain\/dsl-types/.test(source);
          if (!isDomainOrigin) {
            violations.push(`${fileRel}: shared DSL 型 import の起点が domain/dsl-types ではない -> ${source}`);
          }
        }
      }
    }

    assert.deepStrictEqual(violations, [], `CLI/Utils/Registry の shared DSL import 起点違反を検知\n${violations.join('\n')}`);
  });
});
