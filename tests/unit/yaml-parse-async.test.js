const { describe, it } = require('mocha');
const { expect } = require('chai');
const { parseYamlTextAsync } = require('../../out/dsl/yaml-parse-async');

describe('parseYamlTextAsync (dsl kernel)', () => {
  it('有効な YAML をパースしてオブジェクトを返す', async () => {
    const result = await parseYamlTextAsync('page:\n  id: x\n');
    expect(result).to.deep.equal({ page: { id: 'x' } });
  });

  it('不正 YAML は reject する', async () => {
    try {
      await parseYamlTextAsync('a: : b');
      expect.fail('should reject');
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
    }
  });
});
