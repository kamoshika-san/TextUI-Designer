
const { expect } = require('chai');
const sinon = require('sinon');

const { CompletionCache } = require('../../out/services/completion-cache');

describe('CompletionCache', () => {
  it('TTL 内の completion items を返す', () => {
    const cache = new CompletionCache(1000);
    const now = Date.now();
    cache.setCachedCompletionItems('k', [{ label: 'page' }], now);

    const result = cache.getCachedCompletionItems('k', now + 100);
    expect(result).to.have.length(1);
  });

  it('TTL 超過の completion items は返さない', () => {
    const cache = new CompletionCache(10);
    const now = Date.now();
    cache.setCachedCompletionItems('k', [{ label: 'page' }], now);

    const result = cache.getCachedCompletionItems('k', now + 20);
    expect(result).to.equal(undefined);
  });

  it('completion items の TTL 動作は schema ロードに依存しない', () => {
    const cache = new CompletionCache(1000);
    const now = Date.now();
    cache.setCachedCompletionItems('k', [{ label: 'page' }], now);
    expect(cache.getCachedCompletionItems('k', now + 100)).to.have.length(1);
  });
});
