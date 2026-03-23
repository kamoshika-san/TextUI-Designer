const assert = require('assert');

describe('yaml error suggestions helper', () => {
  const { buildYamlParseErrorSuggestions } = require('../../out/services/webview/yaml-error-suggestions');

  it('maps duplicate key to the shared repair hint', () => {
    const suggestions = buildYamlParseErrorSuggestions('duplicate key at line 3');
    assert.strictEqual(suggestions.length, 1);
    assert.match(suggestions[0], /Duplicate YAML key/);
  });

  it('maps too large to the shared file-size hint', () => {
    const suggestions = buildYamlParseErrorSuggestions('file too large');
    assert.strictEqual(suggestions.length, 1);
    assert.match(suggestions[0], /1MB or less/);
  });
});
