const assert = require('assert');

describe('TextUiMcpServer', () => {
  let TextUiMcpServer;

  before(() => {
    ({ TextUiMcpServer } = require('../../out/mcp/server'));
  });

  it('initialize と tools/list に応答する', async () => {
    const server = new TextUiMcpServer();

    const initialize = await server.handleMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05'
      }
    });

    assert.ok(initialize.result);
    assert.strictEqual(initialize.result.serverInfo.name, 'textui-designer-mcp');

    const toolsList = await server.handleMessage({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list'
    });

    const toolNames = toolsList.result.tools.map(tool => tool.name);
    assert.ok(toolNames.includes('generate_ui'));
    assert.ok(toolNames.includes('validate_ui'));
  });

  it('tools/call generate_ui がDSLを返す', async () => {
    const server = new TextUiMcpServer();
    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'generate_ui',
        arguments: {
          title: 'サインアップ',
          components: [
            { type: 'Input', props: { label: 'メールアドレス' } },
            { type: 'Button', props: { label: '登録' } }
          ]
        }
      }
    });

    assert.ok(response.result);
    assert.ok(response.result.structuredContent.dsl.page);
    assert.strictEqual(response.result.structuredContent.validation.valid, true);
  });

  it('resources/read がschemaを返す', async () => {
    const server = new TextUiMcpServer();
    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 4,
      method: 'resources/read',
      params: {
        uri: 'textui://schema/main'
      }
    });

    assert.ok(response.result.contents.length > 0);
    assert.ok(response.result.contents[0].text.includes('schema'));
  });
});
