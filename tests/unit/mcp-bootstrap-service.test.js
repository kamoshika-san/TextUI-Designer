const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('mcp-bootstrap-service', () => {
  let upsertMcpServerConfig;
  let upsertCodexServerConfig;
  let resolveUserMcpJsonPath;
  let resolveUserCodexConfigPath;
  let resolveMcpServerScriptPath;
  let createMcpServerConfigEntry;
  const tempRoot = path.resolve(__dirname, '../../.tmp-mcp-bootstrap-test');

  before(() => {
    ({
      upsertMcpServerConfig,
      upsertCodexServerConfig,
      resolveUserMcpJsonPath,
      resolveUserCodexConfigPath,
      resolveMcpServerScriptPath,
      createMcpServerConfigEntry
    } = require('../../out/services/mcp-bootstrap-service'));
  });

  beforeEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    fs.mkdirSync(tempRoot, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('upsertMcpServerConfig は新規mcp.jsonを作成する', () => {
    const filePath = path.join(tempRoot, '.vscode', 'mcp.json');
    const changed = upsertMcpServerConfig(filePath, 'textui-designer', {
      type: 'stdio',
      command: '/usr/bin/node',
      args: ['/opt/textui/server.js']
    });

    assert.strictEqual(changed, true);
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.ok(parsed.servers);
    assert.ok(parsed.servers['textui-designer']);
  });

  it('upsertMcpServerConfig は既存serversを保持する', () => {
    const filePath = path.join(tempRoot, 'mcp.json');
    fs.writeFileSync(filePath, JSON.stringify({
      servers: {
        existing: {
          type: 'stdio',
          command: '/bin/existing',
          args: []
        }
      }
    }, null, 2));

    upsertMcpServerConfig(filePath, 'textui-designer', {
      type: 'stdio',
      command: '/usr/bin/node',
      args: ['/opt/textui/server.js']
    });

    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.ok(parsed.servers.existing);
    assert.ok(parsed.servers['textui-designer']);
  });

  it('resolveUserMcpJsonPath はLinuxのCode配下を解決できる', function () {
    if (process.platform !== 'linux') {
      this.skip();
    }
    const p = resolveUserMcpJsonPath({
      platform: 'linux',
      appName: 'Visual Studio Code',
      homeDir: '/home/test-user',
      env: {}
    });
    assert.strictEqual(p, '/home/test-user/.config/Code/User/mcp.json');
  });

  it('resolveUserCodexConfigPath はLinuxで~/.codex/config.tomlを返す', function () {
    if (process.platform !== 'linux') {
      this.skip();
    }
    const p = resolveUserCodexConfigPath({
      homeDir: '/home/test-user',
      env: {}
    });
    assert.strictEqual(p, '/home/test-user/.codex/config.toml');
  });

  it('upsertCodexServerConfig はconfig.tomlへmcp_serversセクションを作成する', () => {
    const filePath = path.join(tempRoot, '.codex', 'config.toml');
    const changed = upsertCodexServerConfig(filePath, 'textui-designer', {
      type: 'stdio',
      command: '/usr/bin/node',
      args: ['/opt/textui/server.js']
    });

    assert.strictEqual(changed, true);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('[mcp_servers.textui-designer]'));
    assert.ok(content.includes('command = "/usr/bin/node"'));
    assert.ok(content.includes('args = ["/opt/textui/server.js"]'));
  });

  it('resolveMcpServerScriptPath は拡張配下のout/mcp/server.jsを返す', () => {
    const p = resolveMcpServerScriptPath('/opt/ext/textui-designer-0.4.0');
    assert.strictEqual(p, path.join('/opt/ext/textui-designer-0.4.0', 'out', 'mcp', 'server.js'));
  });

  it('createMcpServerConfigEntry はnodeコマンドを既定値にする', () => {
    const entry = createMcpServerConfigEntry({
      extensionPath: '/opt/ext/textui-designer-0.4.0'
    });

    assert.strictEqual(entry.type, 'stdio');
    assert.strictEqual(entry.command, 'node');
    assert.deepStrictEqual(entry.args, [path.join('/opt/ext/textui-designer-0.4.0', 'out', 'mcp', 'server.js')]);
    assert.strictEqual(entry.cwd, '/opt/ext/textui-designer-0.4.0');
  });
});
