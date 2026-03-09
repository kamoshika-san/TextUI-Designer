const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

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
    assert.ok(toolNames.includes('run_cli'));
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

  it('resources/read textui://cli/run で version を実行できる', async () => {
    const server = new TextUiMcpServer();
    const args = encodeURIComponent(JSON.stringify(['version']));
    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 41,
      method: 'resources/read',
      params: {
        uri: `textui://cli/run?args=${args}&parseJson=false`
      }
    });

    assert.ok(response.result);
    assert.ok(Array.isArray(response.result.contents));
    assert.ok(response.result.contents.length > 0);
    const parsed = JSON.parse(response.result.contents[0].text);
    assert.strictEqual(parsed.exitCode, 0);
    assert.ok(parsed.stdout.includes('textui-cli'));
  });
  it('tools/call run_cli が version を実行できる', async () => {
    const server = new TextUiMcpServer();
    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'run_cli',
        arguments: {
          args: ['version'],
          parseJson: false
        }
      }
    });

    assert.ok(response.result);
    assert.strictEqual(response.result.structuredContent.exitCode, 0);
    assert.ok(response.result.structuredContent.stdout.includes('textui-cli'));
  });

  it('tools/call run_cli が providers --json をJSON解析して返す', async () => {
    const server = new TextUiMcpServer();
    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'run_cli',
        arguments: {
          args: ['providers', '--json']
        }
      }
    });

    assert.ok(response.result);
    assert.strictEqual(response.result.structuredContent.exitCode, 0);
    assert.ok(response.result.structuredContent.parsedJson);
    assert.ok(Array.isArray(response.result.structuredContent.parsedJson.providers));
  });

  it('tools/call capture_preview でPNGを出力できる', async () => {
    const server = new TextUiMcpServer();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-mcp-capture-test-'));
    const dslPath = path.join(tmpDir, 'sample.tui.yml');
    const outPath = path.join(tmpDir, 'preview.png');
    const mockBrowser = path.join(tmpDir, 'mock-browser.js');
    fs.writeFileSync(dslPath, `
page:
  id: mcp-capture
  title: "MCP Capture"
  layout: vertical
  components:
    - Text:
        variant: p
        value: "hello"
`, 'utf8');
    fs.writeFileSync(mockBrowser, `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const screenshotArg = process.argv.find(arg => arg.startsWith('--screenshot='));
if (!screenshotArg) {
  process.exit(2);
}
const target = screenshotArg.slice('--screenshot='.length);
fs.mkdirSync(path.dirname(target), { recursive: true });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBAANQ8Z8AAAAASUVORK5CYII=', 'base64');
fs.writeFileSync(target, png);
`, 'utf8');
    fs.chmodSync(mockBrowser, 0o755);

    try {
      const response = await server.handleMessage({
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'capture_preview',
          arguments: {
            dslFile: dslPath,
            output: outPath,
            browser: mockBrowser
          }
        }
      });

      assert.ok(response.result);
      const payload = response.result.structuredContent;
      assert.strictEqual(payload.exitCode, 0);
      assert.ok(payload.parsedJson);
      assert.strictEqual(payload.parsedJson.captured, true);
      assert.ok(fs.existsSync(outPath));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
