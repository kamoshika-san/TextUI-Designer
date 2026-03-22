const assert = require('assert');
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const { HtmlExporter } = require('../../out/exporters/html-exporter');

/**
 * sample/09-new-built-in-stub が schema + export で壊れないことの最小回帰（E2-S2-T3）。
 * スタブ文言を変えたら、この期待文字列も合わせること。
 */
describe('sample 09-new-built-in-stub', () => {
  it('new-built-in-stub.tui.yml が HtmlExporter で出力できる', async () => {
    const ymlPath = path.join(__dirname, '..', '..', 'sample', '09-new-built-in-stub', 'new-built-in-stub.tui.yml');
    const dsl = yaml.parse(fs.readFileSync(ymlPath, 'utf8'));
    const html = await new HtmlExporter().export(dsl, { format: 'html', useReactRender: false });
    assert.ok(html.includes('Replace this block with your new built-in component.'));
  });
});
