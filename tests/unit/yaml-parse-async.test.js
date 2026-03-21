const { describe, it } = require('mocha');
const { expect } = require('chai');
const path = require('path');

// T-20260321-085: src-first（token-style-property-map.test.js と同型の ts-node 登録）
require('ts-node').register({
  transpileOnly: true,
  project: path.join(__dirname, '../../tsconfig.json')
});

const { parseYamlTextAsync } = require('../../src/dsl/yaml-parse-async');

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
