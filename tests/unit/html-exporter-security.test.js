const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { HtmlExporter } = require('../../out/exporters/html-exporter');

describe('HtmlExporter security', () => {
  it('DSL由来の文字列をHTMLエスケープする', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-security-'));
    const themeFile = path.join(tempDir, 'theme.yml');
    fs.writeFileSync(themeFile, 'theme:\n  name: "Test"\n  version: "1.0.0"\n', 'utf8');

    const exporter = new HtmlExporter();
    const dsl = {
      page: {
        components: [
          { Text: { value: '<img src=x onerror=alert(1)>' } },
          { Input: { label: '<b>label</b>', placeholder: '" onfocus="alert(1)' } },
          { Button: { label: '<script>alert(1)</script>' } },

          { Tabs: { items: [{ label: '<svg onload=alert(1)>' }] } },
          { Alert: { title: '<u>title</u>', message: '<iframe src=javascript:alert(1)></iframe>' } }
        ]
      }
    };

    const html = await exporter.export(dsl, { format: 'html', themePath: themeFile });

    assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
    assert.ok(html.includes('&lt;b&gt;label&lt;/b&gt;'));
    assert.ok(html.includes('&quot; onfocus=&quot;alert(1)'));
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(html.includes('&lt;svg onload=alert(1)&gt;'));
    assert.ok(html.includes('&lt;iframe src=javascript:alert(1)&gt;&lt;/iframe&gt;'));

    assert.ok(!html.includes('<script>alert(1)</script>'));
    assert.ok(!html.includes('<svg onload=alert(1)>'));
    assert.ok(!html.includes('<iframe src=javascript:alert(1)></iframe>'));
  });
});
