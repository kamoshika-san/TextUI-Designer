const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('token slot preview/export boundary guard (T-20260322-358)', () => {
  it('preview and export token-slot logic stays on the shared helper lane', () => {
    const previewRel = 'src/renderer/token-inline-style-from-definition.ts';
    const exportRel = 'src/exporters/theme-style-resolver.ts';
    const helperRel = 'src/components/definitions/token-slot-style-shared.ts';

    const previewCode = read(previewRel);
    const exportCode = read(exportRel);
    const helperCode = read(helperRel);

    assert.ok(
      previewCode.includes("../components/definitions/token-slot-style-shared"),
      `${previewRel} must import the shared token-slot helper`
    );
    assert.ok(
      exportCode.includes("../components/definitions/token-slot-style-shared"),
      `${exportRel} must import the shared token-slot helper`
    );

    assert.ok(
      !/from\s+['"][^'"]*exporters(?:\/|['"])/.test(previewCode),
      `${previewRel} must not import exporters directly`
    );
    assert.ok(
      !/from\s+['"][^'"]*renderer(?:\/|['"])/.test(exportCode),
      `${exportRel} must not import renderer directly`
    );

    assert.ok(
      /resolveComponentTokenSlotBindings/.test(helperCode) &&
        /formatResolvedTokenSlotValue/.test(helperCode),
      `${helperRel} must remain the shared token-slot binding entrypoint`
    );
  });
});
