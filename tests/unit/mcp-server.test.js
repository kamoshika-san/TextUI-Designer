const assert = require('assert');
const { execFileSync } = require('child_process');
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
    assert.ok(toolNames.includes('validate_flow'));
    assert.ok(toolNames.includes('compare_flow'));
    assert.ok(toolNames.includes('export_flow'));
    assert.ok(toolNames.includes('list_providers'));
    assert.ok(toolNames.includes('inspect_state'));
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

  it('tools/call generate_ui は themePath 指定でHTMLへテーマ変数を埋め込む', async () => {
    const server = new TextUiMcpServer();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-mcp-theme-test-'));
    const themePath = path.join(tmpDir, 'custom-theme.yml');
    fs.writeFileSync(themePath, `
theme:
  name: "MCP Theme"
  tokens:
    color:
      primary: "#334455"
      text:
        primary: "#f9fafb"
`, 'utf8');

    try {
      const response = await server.handleMessage({
        jsonrpc: '2.0',
        id: 31,
        method: 'tools/call',
        params: {
          name: 'generate_ui',
          arguments: {
            title: 'テーマ付き生成',
            format: 'html',
            themePath
          }
        }
      });

      assert.ok(response.result);
      const exported = response.result.structuredContent.exportedCode;
      assert.ok(typeof exported === 'string');
      assert.match(exported, /--color-primary:\s*#334455\s*!important;/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
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


  it('resources/read textui://components/catalog にImageが含まれる', async () => {
    const server = new TextUiMcpServer();
    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 42,
      method: 'resources/read',
      params: {
        uri: 'textui://components/catalog'
      }
    });

    assert.ok(response.result);
    assert.ok(Array.isArray(response.result.contents));
    const payload = JSON.parse(response.result.contents[0].text);
    const image = payload.components.find(component => component.name === 'Image');
    assert.ok(image);
    assert.deepStrictEqual(image.requiredProps, ['src']);
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

  it('tools/call validate_flow validates a navigation flow file', async () => {
    const server = new TextUiMcpServer();
    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 66,
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

  it('tools/call export_flow exports a navigation flow artifact', async () => {
    const server = new TextUiMcpServer();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-mcp-flow-export-'));
    const outPath = path.join(tmpDir, 'flow.tsx');

    try {
      const response = await server.handleMessage({
        jsonrpc: '2.0',
        id: 67,
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

  it('tools/call compare_flow returns machine-readable flow diff', async function () {
    this.timeout(20000);
    const server = new TextUiMcpServer();
    const gitRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-mcp-flow-compare-'));
    const flowPath = path.join(gitRepo, 'app.tui.flow.yml');

    try {
      execFileSync('git', ['init'], { cwd: gitRepo, encoding: 'utf8' });
      execFileSync('git', ['config', 'user.name', 'Codex Test'], { cwd: gitRepo, encoding: 'utf8' });
      execFileSync('git', ['config', 'user.email', 'codex@example.com'], { cwd: gitRepo, encoding: 'utf8' });
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
      execFileSync('git', ['add', 'app.tui.flow.yml'], { cwd: gitRepo, encoding: 'utf8' });
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
        id: 68,
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

  it('tools/call capture_preview はMCP内でbrowser指定を使わずCLIへ委譲する', async () => {
    const server = new TextUiMcpServer();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-mcp-capture-test-'));
    const dslPath = path.join(tmpDir, 'sample.tui.yml');
    const outPath = path.join(tmpDir, 'preview.png');
    const themePath = path.join(tmpDir, 'theme.yml');
    fs.writeFileSync(dslPath, 'page:\n  id: mcp-capture\n  title: "MCP Capture"\n  layout: vertical\n  components: []\n', 'utf8');
    fs.writeFileSync(themePath, 'theme:\n  name: "MCP Theme"\n', 'utf8');

    try {
      let capturedRunCliArgs = null;
      server.runCli = async args => {
        capturedRunCliArgs = args;
        return {
          command: 'textui capture',
          cwd: process.cwd(),
          exitCode: 0,
          timedOut: false,
          stdout: '{"captured":true}',
          stderr: '',
          parsedJson: { captured: true }
        };
      };

      const response = await server.handleMessage({
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'capture_preview',
          arguments: {
            dslFile: dslPath,
            output: outPath,
            themePath,
            browser: '/tmp/forbidden-browser-path'
          }
        }
      });

      assert.ok(response.result);
      const payload = response.result.structuredContent;
      assert.strictEqual(payload.exitCode, 0);
      assert.ok(payload.parsedJson);
      assert.strictEqual(payload.parsedJson.captured, true);
      assert.ok(capturedRunCliArgs);
      assert.ok(Array.isArray(capturedRunCliArgs.args));
      assert.ok(capturedRunCliArgs.args.includes('capture'));
      assert.ok(capturedRunCliArgs.args.includes('--file'));
      assert.ok(capturedRunCliArgs.args.includes(dslPath));
      assert.ok(capturedRunCliArgs.args.includes('--theme'));
      assert.ok(capturedRunCliArgs.args.includes(themePath));
      assert.ok(!capturedRunCliArgs.args.includes('--browser'));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('tools/call capture_preview は不正な width を拒否する', async () => {
    const server = new TextUiMcpServer();
    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 71,
      method: 'tools/call',
      params: {
        name: 'capture_preview',
        arguments: {
          dslFile: 'sample/01-basic/sample.tui.yml',
          width: -1
        }
      }
    });

    assert.ok(response.error);
    assert.match(response.error.message, /capture_preview width must be a positive number/);
  });

  it('tools/call run_cli は capture時の --browser 指定を拒否する', async () => {
    const server = new TextUiMcpServer();
    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: {
        name: 'run_cli',
        arguments: {
          args: ['capture', '--file', 'sample/01-basic/sample.tui.yml', '--browser', '/tmp/evil']
        }
      }
    });

    assert.ok(response.error);
    assert.match(response.error.message, /does not allow --browser or --allow-no-sandbox/);
  });

  it('resources/list と prompts/list が定義済みメタデータを返す', async () => {
    const server = new TextUiMcpServer();

    const resources = await server.handleMessage({
      jsonrpc: '2.0',
      id: 9,
      method: 'resources/list'
    });
    const prompts = await server.handleMessage({
      jsonrpc: '2.0',
      id: 10,
      method: 'prompts/list'
    });

    assert.ok(resources.result);
    assert.ok(Array.isArray(resources.result.resources));
    assert.ok(resources.result.resources.some(resource => resource.uri === 'textui://schema/main'));
    assert.ok(resources.result.resources.some(resource => resource.uri === 'textui://cli/run'));

    assert.ok(prompts.result);
    assert.ok(Array.isArray(prompts.result.prompts));
    assert.ok(prompts.result.prompts.some(prompt => prompt.name === 'design_screen'));
    assert.ok(prompts.result.prompts.some(prompt => prompt.name === 'fix_validation_error'));
  });

  it('未対応メソッドで Method not found を返す', async () => {
    const server = new TextUiMcpServer();
    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 11,
      method: 'unknown/method'
    });

    assert.ok(response.error);
    assert.match(response.error.message, /Method not found: unknown\/method/);
  });

  it('tools/call list_providers は provider一覧を構造化データで返す', async () => {
    const server = new TextUiMcpServer();
    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 63,
      method: 'tools/call',
      params: {
        name: 'list_providers',
        arguments: {}
      }
    });

    assert.ok(response.result);
    assert.strictEqual(response.result.structuredContent.exitCode, 0);
    assert.ok(response.result.structuredContent.parsedJson);
    assert.ok(Array.isArray(response.result.structuredContent.parsedJson.providers));
    assert.ok(response.result.structuredContent.parsedJson.providers.some(provider => provider.name === 'html'));
  });

  it('tools/call inspect_state は state show --json を構造化データで返す', async () => {
    const server = new TextUiMcpServer();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-mcp-state-test-'));
    const statePath = path.join(tmpDir, 'sample.state.json');
    fs.writeFileSync(statePath, JSON.stringify({
      dsl: { entry: '/tmp/sample.tui.yml' },
      resources: [
        { id: 'hero', kind: 'component', fingerprint: 'abc123' }
      ]
    }, null, 2), 'utf8');

    try {
      const response = await server.handleMessage({
        jsonrpc: '2.0',
        id: 64,
        method: 'tools/call',
        params: {
          name: 'inspect_state',
          arguments: {
            statePath
          }
        }
      });

      assert.ok(response.result);
      assert.strictEqual(response.result.structuredContent.exitCode, 0);
      assert.ok(response.result.structuredContent.parsedJson);
      assert.strictEqual(response.result.structuredContent.parsedJson.resources.length, 1);
      assert.strictEqual(response.result.structuredContent.parsedJson.resources[0].id, 'hero');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
