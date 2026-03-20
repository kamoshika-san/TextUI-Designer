const assert = require('assert');
const {
  CONTRIBUTES_CONFIGURATION_TITLE,
  getGeneratedContributesConfiguration,
  getGeneratedConfigurationProperties
} = require('../../out/config/configuration-properties.js');

describe('configuration contributes (T-022 single source)', () => {
  it('title はコード上の定数と一致し、properties は getGeneratedConfigurationProperties と同一', () => {
    const full = getGeneratedContributesConfiguration();
    assert.strictEqual(full.title, CONTRIBUTES_CONFIGURATION_TITLE);
    assert.strictEqual(typeof full.title, 'string');
    assert.ok(full.properties && typeof full.properties === 'object');
    const propsOnly = getGeneratedConfigurationProperties();
    assert.deepStrictEqual(full.properties, propsOnly);
  });

  it('package.json のキー接頭辞は textui-designer.* に統一されている', () => {
    const keys = Object.keys(getGeneratedConfigurationProperties());
    assert.ok(keys.length > 0);
    for (const k of keys) {
      assert.ok(k.startsWith('textui-designer.'), `unexpected key: ${k}`);
    }
  });
});
