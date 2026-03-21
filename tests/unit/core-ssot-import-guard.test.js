const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('core SSoT import guard (T-20260321-136)', () => {
  it('src/core レイヤに禁止 import が存在しない', () => {
    const coreDir = path.resolve(__dirname, '../../src/core');
    const offenders = [];
    const restrictedImportPath = ['renderer', 'types'].join('/');

    function walk(dir) {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx|js)$/.test(ent.name)) continue;
        const code = fs.readFileSync(full, 'utf8');
        if (new RegExp(`\\bfrom\\s+['"][^'"]*${restrictedImportPath}['"]`).test(code)) {
          offenders.push(path.relative(path.resolve(__dirname, '../..'), full));
        }
      }
    }

    walk(coreDir);
    assert.deepStrictEqual(
      offenders,
      [],
      `core レイヤで禁止 import が検出されました:\n${offenders.join('\n')}`
    );
  });
});
