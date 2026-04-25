const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

describe('MCP flow tools', () => {
  let TextUiMcpServer;

  before(() => {
    ({ TextUiMcpServer } = require('../../out/mcp/server'));
  });

  it('lists the flow MCP tools in tools/list', async () => {
    const server = new TextUiMcpServer();
    await server.handleMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05' }
    });

    const toolsList = await server.handleMessage({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list'
    });

    const toolNames = toolsList.result.tools.map(tool => tool.name);
    assert.ok(toolNames.includes('validate_flow'));
    assert.ok(toolNames.includes('compare_flow'));
    assert.ok(toolNames.includes('analyze_flow'));
    assert.ok(toolNames.includes('route_flow'));
    assert.ok(toolNames.includes('export_flow'));
  });

  it('validate_flow validates the navigation sample', async () => {
    const server = new TextUiMcpServer();
    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'validate_flow',
        arguments: {
          filePath: 'sample/12-navigation/app.tui.flow.yml'
        }
      }
    });

    assert.ok(response.result);
    assert.strictEqual(response.result.structuredContent.exitCode, 0);
    assert.strictEqual(response.result.structuredContent.parsedJson.valid, true);
  });

  it('export_flow exports a navigation artifact through the CLI bridge', async () => {
    const server = new TextUiMcpServer();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-mcp-flow-export-'));
    const outPath = path.join(tmpDir, 'flow.tsx');

    try {
      const response = await server.handleMessage({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'export_flow',
          arguments: {
            filePath: 'sample/12-navigation/app.tui.flow.yml',
            format: 'react-router',
            outputPath: outPath
          }
        }
      });

      assert.ok(response.result);
      assert.strictEqual(response.result.structuredContent.exitCode, 0);
      assert.strictEqual(response.result.structuredContent.parsedJson.provider, 'react-flow');
      assert.ok(fs.existsSync(outPath));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('analyze_flow returns graph-aware analysis for a v2 flow sample', async () => {
    const server = new TextUiMcpServer();
    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 41,
      method: 'tools/call',
      params: {
        name: 'analyze_flow',
        arguments: {
          filePath: 'sample/13-enterprise-flow/app.tui.flow.yml',
          entryId: 'welcome',
          screenId: 'launch'
        }
      }
    });

    assert.ok(response.result);
    assert.strictEqual(response.result.structuredContent.exitCode, 0);
    assert.strictEqual(response.result.structuredContent.parsedJson.kind, 'flow-analysis-result/v1');
    assert.ok(response.result.structuredContent.parsedJson.query.reachableFromEntry.includes('launch'));
  });

  it('route_flow returns a route to the success terminal', async () => {
    const server = new TextUiMcpServer();
    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 42,
      method: 'tools/call',
      params: {
        name: 'route_flow',
        arguments: {
          filePath: 'sample/13-enterprise-flow/app.tui.flow.yml',
          entryId: 'welcome',
          toTerminalKind: 'success'
        }
      }
    });

    assert.ok(response.result);
    assert.strictEqual(response.result.structuredContent.exitCode, 0);
    assert.strictEqual(response.result.structuredContent.parsedJson.kind, 'flow-route-result/v1');
    assert.strictEqual(response.result.structuredContent.parsedJson.found, true);
    assert.strictEqual(response.result.structuredContent.parsedJson.route.screenIds.at(-1), 'launch');
  });

  it('compare_flow returns machine-readable flow diff', async function () {
    this.timeout(20000);
    const server = new TextUiMcpServer();
    const gitRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-mcp-flow-compare-'));
    const flowPath = path.join(gitRepo, 'app.tui.flow.yml');

    try {
      execFileSync('git', ['init'], { cwd: gitRepo, encoding: 'utf8' });
      execFileSync('git', ['config', 'user.name', 'Codex Test'], { cwd: gitRepo, encoding: 'utf8' });
      execFileSync('git', ['config', 'user.email', 'codex@example.com'], { cwd: gitRepo, encoding: 'utf8' });
      execFileSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: gitRepo, encoding: 'utf8' });
      fs.mkdirSync(path.join(gitRepo, 'screens'), { recursive: true });
      fs.writeFileSync(path.join(gitRepo, 'screens', 'cart.tui.yml'), 'page:\n  id: cart\n  title: Cart\n  layout: vertical\n  components: []\n', 'utf8');
      fs.writeFileSync(path.join(gitRepo, 'screens', 'shipping.tui.yml'), 'page:\n  id: shipping\n  title: Shipping\n  layout: vertical\n  components: []\n', 'utf8');

      fs.writeFileSync(flowPath, `
flow:
  id: checkout
  title: "Checkout Flow"
  entry: cart
  screens:
    - id: cart
      page: ./screens/cart.tui.yml
      title: Cart
  transitions: []
`, 'utf8');
      execFileSync('git', ['add', '.'], { cwd: gitRepo, encoding: 'utf8' });
      execFileSync('git', ['commit', '-m', 'base'], { cwd: gitRepo, encoding: 'utf8' });
      const baseRef = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: gitRepo, encoding: 'utf8' }).trim();

      fs.writeFileSync(flowPath, `
flow:
  id: checkout
  title: "Checkout Flow v2"
  entry: shipping
  screens:
    - id: shipping
      page: ./screens/shipping.tui.yml
      title: Shipping
  transitions: []
`, 'utf8');
      execFileSync('git', ['add', 'app.tui.flow.yml'], { cwd: gitRepo, encoding: 'utf8' });
      execFileSync('git', ['commit', '-m', 'head'], { cwd: gitRepo, encoding: 'utf8' });
      const headRef = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: gitRepo, encoding: 'utf8' }).trim();

      const response = await server.handleMessage({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'compare_flow',
          arguments: {
            filePath: flowPath,
            baseRef,
            headRef
          }
        }
      });

      assert.ok(response.result);
      assert.strictEqual(response.result.structuredContent.exitCode, 0);
      assert.strictEqual(response.result.structuredContent.parsedJson.kind, 'flow-semantic-diff-result/v1');
      assert.strictEqual(response.result.structuredContent.parsedJson.result.ok, true);
    } finally {
      fs.rmSync(gitRepo, { recursive: true, force: true });
    }
  });
});
