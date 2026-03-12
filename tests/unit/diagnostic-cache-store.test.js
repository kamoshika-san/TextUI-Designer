const assert = require('assert');

const { DiagnosticCacheStore } = require('../../out/services/diagnostics/diagnostic-cache-store');

describe('DiagnosticCacheStore', () => {
  it('getFresh returns entry only when content and TTL match', () => {
    const cache = new Map();
    const store = new DiagnosticCacheStore(cache, 10, 1000);
    const now = Date.now();

    store.set('file://a', { content: 'x', diagnostics: [], timestamp: now - 200 });

    assert.ok(store.getFresh('file://a', 'x', 500, now));
    assert.strictEqual(store.getFresh('file://a', 'y', 500, now), null);
    assert.strictEqual(store.getFresh('file://a', 'x', 100, now), null);
  });

  it('clearLegacyKeys removes uri:hash style entries', () => {
    const cache = new Map();
    const store = new DiagnosticCacheStore(cache, 10, 1000);

    cache.set('file://a', { content: 'x', diagnostics: [], timestamp: Date.now() });
    cache.set('file://a:legacy', { content: 'x', diagnostics: [], timestamp: Date.now() });
    cache.set('file://b:legacy', { content: 'x', diagnostics: [], timestamp: Date.now() });

    store.clearLegacyKeys('file://a');

    assert.strictEqual(cache.has('file://a:legacy'), false);
    assert.strictEqual(cache.has('file://a'), true);
    assert.strictEqual(cache.has('file://b:legacy'), true);
  });
});
