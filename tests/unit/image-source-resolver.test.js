const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { resolveImageSourcesInDsl, resolveLocalImagePath } = require('../../out/utils/image-source-resolver');

describe('image-source-resolver', () => {
  it('相対パスのImage.srcを解決して変換する', () => {
    const dsl = {
      page: {
        components: [
          { Image: { src: 'assets/avatar.png', alt: 'avatar' } },
          { Text: { value: 'keep' } }
        ]
      }
    };

    const dslFileDir = path.join(path.sep, 'tmp', 'project');
    const result = resolveImageSourcesInDsl(dsl, {
      dslFileDir,
      fileExists: p => p.endsWith(path.join('assets', 'avatar.png')) || p.endsWith('assets/avatar.png'),
      mapResolvedSrc: p => `resolved:${p}`
    });

    const expectedResolved = path.resolve(dslFileDir, 'assets/avatar.png');
    assert.strictEqual(result.page.components[0].Image.src, `resolved:${expectedResolved}`);
    assert.strictEqual(result.page.components[1].Text.value, 'keep');
    assert.strictEqual(dsl.page.components[0].Image.src, 'assets/avatar.png');
  });

  it('URLやdata URIは解決対象外', () => {
    assert.strictEqual(resolveLocalImagePath('https://example.com/a.png', '/tmp'), null);
    assert.strictEqual(resolveLocalImagePath('data:image/png;base64,abc', '/tmp'), null);
  });

  it('file:// URIをローカルパスへ変換する', () => {
    const tempPath = path.join(os.tmpdir(), 'textui-resolver-file-uri.png');
    const fileUri = new URL(`file://${tempPath}`).toString();
    const resolved = resolveLocalImagePath(fileUri, '/tmp');

    assert.ok(typeof resolved === 'string');
    assert.ok(resolved.endsWith('textui-resolver-file-uri.png'));
  });

  it('存在しない画像は元のsrcを保持する', () => {
    const dsl = { page: { components: [{ Image: { src: './missing.png' } }] } };
    const result = resolveImageSourcesInDsl(dsl, {
      dslFileDir: '/tmp/project',
      fileExists: () => false,
      mapResolvedSrc: p => `resolved:${p}`
    });

    assert.strictEqual(result.page.components[0].Image.src, './missing.png');
  });
});
