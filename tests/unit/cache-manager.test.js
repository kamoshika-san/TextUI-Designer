const assert = require('assert');
const { CacheManager } = require('../../out/utils/cache-manager');

describe('CacheManager', () => {
  it('calculates hit rate correctly', () => {
    const manager = new CacheManager({ ttl: 5000, maxSize: 5 });
    const dsl = { page: { id: '1', components: [] } };
    const format = 'html';

    // first get should miss
    assert.strictEqual(manager.get(dsl, format), null);

    // store result
    manager.set(dsl, format, 'cached');

    // second get should hit
    assert.strictEqual(manager.get(dsl, format), 'cached');

    const stats = manager.getStats();
    assert.strictEqual(stats.size, 1);
    assert.strictEqual(stats.maxSize, 5);
    assert.ok(Math.abs(stats.hitRate - 1 / 3) < 1e-6);
  });
});
