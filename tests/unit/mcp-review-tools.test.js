/**
 * MCP Review Tools テスト（diff_ui / explain_change）
 */

const assert = require('assert');

describe('mcp: tool-manifest includes diff_ui and explain_change', () => {
  let manifest;

  before(() => {
    manifest = require('../../out/mcp/tool-manifest');
  });

  it('TOOLS includes diff_ui', () => {
    const tool = manifest.TOOLS.find(t => t.name === 'diff_ui');
    assert.ok(tool, 'diff_ui should be in TOOLS');
    assert.ok(tool.inputSchema.properties.filePath);
    assert.ok(tool.inputSchema.properties.baseRef);
    assert.ok(tool.inputSchema.properties.headRef);
  });

  it('TOOLS includes explain_change', () => {
    const tool = manifest.TOOLS.find(t => t.name === 'explain_change');
    assert.ok(tool, 'explain_change should be in TOOLS');
    assert.ok(tool.inputSchema.properties.change);
  });

  it('diff_ui requires filePath, baseRef, headRef', () => {
    const tool = manifest.TOOLS.find(t => t.name === 'diff_ui');
    assert.deepStrictEqual(tool.inputSchema.required, ['filePath', 'baseRef', 'headRef']);
  });

  it('explain_change requires change', () => {
    const tool = manifest.TOOLS.find(t => t.name === 'explain_change');
    assert.deepStrictEqual(tool.inputSchema.required, ['change']);
  });
});

describe('mcp: explain_change handler', () => {
  let handlers;

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

  before(() => {
    const { createToolHandlers } = require('../../out/mcp/tools/tool-handlers');
    const ctx = makeContext({
      change: {
        changeId: 'change-0',
        type: 'UpdateProps',
        componentId: 'btn-submit',
        layer: 'visual',
        impact: 'low',
        humanReadable: { title: 'Label changed', description: 'Submit → Submit Order' }
      }
    });
    handlers = createToolHandlers(ctx);
  });

  it('explain_change returns explanation with title and description', async () => {
    const result = await handlers.explain_change();
    assert.strictEqual(result.changeId, 'change-0');
    assert.strictEqual(result.type, 'UpdateProps');
    assert.strictEqual(result.explanation.title, 'Label changed');
    assert.strictEqual(result.explanation.description, 'Submit → Submit Order');
    assert.strictEqual(result.explanation.impact, 'low');
  });

  it('explain_change falls back to generated title when humanReadable is absent', async () => {
    const { createToolHandlers } = require('../../out/mcp/tools/tool-handlers');
    const ctx = makeContext({
      change: {
        changeId: 'change-1',
        type: 'AddComponent',
        componentId: 'new-btn',
        layer: 'structure',
        impact: 'medium'
      }
    });
    const h = createToolHandlers(ctx);
    const result = await h.explain_change();
    assert.ok(result.explanation.title.includes('AddComponent'));
    assert.ok(result.explanation.title.includes('new-btn'));
  });
});
