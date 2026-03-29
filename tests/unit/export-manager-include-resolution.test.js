/**
 * Integration test: ExportManager.exportFromFile resolves $include directives.
 *
 * Regression guard for the bug where exportFromFile used YAML.parse() directly
 * instead of loadDslWithIncludesFromPath(), causing $include to go unresolved
 * in the VSCode export path.
 */
const assert = require('assert');
const path = require('path');

describe('ExportManager.exportFromFile — $include 解決の回帰テスト', () => {
  const exportManagerPath = path.resolve(__dirname, '../../out/exporters/export-manager.js');
  const includeSample = path.resolve(__dirname, '../../sample/03-include/include-sample.tui.yml');

  it('$include を含む DSL ファイルを exportFromFile で export すると展開済みの HTML が返る', async () => {
    delete require.cache[exportManagerPath];
    const { ExportManager } = require(exportManagerPath);
    const manager = new ExportManager();

    const html = await manager.exportFromFile(includeSample, { format: 'html' });

    assert.ok(typeof html === 'string', 'export result should be a string');
    assert.ok(html.length > 0, 'export result should not be empty');

    // Confirm $include was resolved — params-substituted template content must appear in output.
    // These values only exist in params (title/subtitle/sectionTitle) and would be absent
    // if $include directives were left unresolved.
    assert.ok(
      html.includes('ようこそ'),
      'header template params substitution (title: ようこそ) must appear in exported HTML'
    );
    assert.ok(
      html.includes('お問い合わせ'),
      'form-section template params substitution (sectionTitle: お問い合わせ) must appear in exported HTML'
    );
  });
});
