const { describe, it } = require('mocha');
const { expect } = require('chai');
const sinon = require('sinon');

const { CompletionCache } = require('../../out/services/completion-cache');

describe('CompletionCache', () => {
  it('TTL 内の completion items を返す', () => {
    const cache = new CompletionCache({ loadSchema: async () => ({}) }, 1000);
    const now = Date.now();
    cache.setCachedCompletionItems('k', [{ label: 'page' }], now);

    const result = cache.getCachedCompletionItems('k', now + 100);
    expect(result).to.have.length(1);
  });

  it('TTL 超過の completion items は返さない', () => {
    const cache = new CompletionCache({ loadSchema: async () => ({}) }, 10);
    const now = Date.now();
    cache.setCachedCompletionItems('k', [{ label: 'page' }], now);

    const result = cache.getCachedCompletionItems('k', now + 20);
    expect(result).to.equal(undefined);
  });

  it('schema を TTL 付きで再利用する', async () => {
    const schema = { version: 1 };
    const schemaManager = { loadSchema: sinon.stub().resolves(schema) };
    const cache = new CompletionCache(schemaManager, 1000);

    const first = await cache.loadSchemaWithCache(100);
    const second = await cache.loadSchemaWithCache(200);

    expect(first).to.equal(schema);
    expect(second).to.equal(schema);
    expect(schemaManager.loadSchema.calledOnce).to.equal(true);
  });
});
