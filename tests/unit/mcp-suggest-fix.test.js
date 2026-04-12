/**
 * MCP suggest_fix tool テスト
 */

const assert = require('assert');

describe('mcp: suggest_fix tool', () => {
  let manifest;

  before(() => {
    manifest = require('../../out/mcp/tool-manifest');
  });

  it('TOOLS includes suggest_fix', () => {
    const tool = manifest.TOOLS.find(t => t.name === 'suggest_fix');
    assert.ok(tool, 'suggest_fix should be in TOOLS');
  });

  it('suggest_fix requires finding', () => {
    const tool = manifest.TOOLS.find(t => t.name === 'suggest_fix');
    assert.deepStrictEqual(tool.inputSchema.required, ['finding']);
  });
});

describe('mcp: suggest_fix handler', () => {
  function makeContext(args) {
    return {
      engine: {},
      args,
      getObjectValue: (obj, key) => typeof obj[key] === 'string' ? obj[key] : undefined,
      getObjectUnknown: (obj, key) => obj[key],
      getObjectBoolean: (obj, key) => typeof obj[key] === 'boolean' ? obj[key] : undefined,
      getObjectArray: (obj, key) => Array.isArray(obj[key]) ? obj[key] : undefined,
      runCli: async () => ({}),
      capturePreview: async () => ({})
    };
  }

  it('returns suggestion with fixHint when present', async () => {
    const { createToolHandlers } = require('../../out/mcp/tools/tool-handlers');
    const ctx = makeContext({
      finding: {
        ruleId: 'a11y/button-label',
        severity: 'warning',
        message: 'Button has no label',
        entityPath: '/page/components/0',
        fixHint: 'Add a label property to the Button component.',
        tags: ['a11y']
      }
    });
    const handlers = createToolHandlers(ctx);
    const result = await handlers.suggest_fix();
    assert.strictEqual(result.ruleId, 'a11y/button-label');
    assert.strictEqual(result.entityPath, '/page/components/0');
    assert.ok(result.suggestion.includes('/page/components/0'));
    assert.ok(result.suggestion.includes('Add a label'));
  });

  it('returns fallback message when fixHint is absent', async () => {
    const { createToolHandlers } = require('../../out/mcp/tools/tool-handlers');
    const ctx = makeContext({
      finding: {
        ruleId: 'some/rule',
        severity: 'info',
        message: 'Some issue',
        entityPath: '/page/components/1',
        tags: []
      }
    });
    const handlers = createToolHandlers(ctx);
    const result = await handlers.suggest_fix();
    assert.strictEqual(result.fixHint, null);
    assert.ok(result.suggestion.includes('No fix hint available'));
  });

  it('suggest_fix does not modify input finding', async () => {
    const { createToolHandlers } = require('../../out/mcp/tools/tool-handlers');
    const finding = {
      ruleId: 'a11y/button-label',
      severity: 'warning',
      message: 'Button has no label',
      entityPath: '/page/components/0',
      fixHint: 'Add a label.',
      tags: ['a11y']
    };
    const original = JSON.stringify(finding);
    const ctx = makeContext({ finding });
    const handlers = createToolHandlers(ctx);
    await handlers.suggest_fix();
    assert.strictEqual(JSON.stringify(finding), original);
  });
});
