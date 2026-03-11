const assert = require('assert');

describe('mcp request handlers', () => {
  let createRequestHandlers;

  before(() => {
    ({ createRequestHandlers } = require('../../out/mcp/request-handlers'));
  });

  it('resources/read は依存関数を呼び出して contents を返す', async () => {
    const handlers = createRequestHandlers({
      handleToolCall: async () => ({}),
      readResource: async uri => ({ uri, ok: true }),
      resolvePrompt: () => ({})
    });

    const response = await handlers['resources/read']({ uri: 'textui://schema/main' });
    assert.ok(Array.isArray(response.contents));
    assert.strictEqual(response.contents[0].uri, 'textui://schema/main');
    assert.deepStrictEqual(JSON.parse(response.contents[0].text), { uri: 'textui://schema/main', ok: true });
  });

  it('prompts/get は name 必須チェックを行う', async () => {
    const handlers = createRequestHandlers({
      handleToolCall: async () => ({}),
      readResource: async () => ({}),
      resolvePrompt: () => ({})
    });

    await assert.rejects(async () => handlers['prompts/get']({}), /prompts\/get requires name/);
  });
});
