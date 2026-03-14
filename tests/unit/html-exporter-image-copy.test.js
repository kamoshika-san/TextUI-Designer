const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { HtmlExporter } = require('../../out/exporters/html-exporter');

describe('HtmlExporter image copy', () => {
  it('ローカル画像を出力ディレクトリ配下へコピーし相対srcで参照する', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-html-export-'));
    const sourceDir = path.join(tempRoot, 'src');
    const outputDir = path.join(tempRoot, 'dist');
    fs.mkdirSync(path.join(sourceDir, 'assets'), { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });

    const imagePath = path.join(sourceDir, 'assets', 'avatar.png');
    fs.writeFileSync(imagePath, 'image-bytes', 'utf8');

    const themeFile = path.join(tempRoot, 'theme.yml');
    fs.writeFileSync(themeFile, 'theme:\n  name: "Test"\n  version: "1.0.0"\n', 'utf8');

    const dsl = {
      page: {
        components: [{ Image: { src: './assets/avatar.png', alt: 'avatar' } }]
      }
    };

    const exporter = new HtmlExporter();
    const html = await exporter.export(dsl, {
      format: 'html',
      outputPath: path.join(outputDir, 'index.html'),
      sourcePath: path.join(sourceDir, 'sample.tui.yml'),
      themePath: themeFile
    });

    assert.ok(html.includes('src="images/avatar.png"'));
    const copied = path.join(outputDir, 'images', 'avatar.png');
    assert.ok(fs.existsSync(copied));
    assert.strictEqual(fs.readFileSync(copied, 'utf8'), 'image-bytes');
  });
});
