const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('mcp-bootstrap-service', () => {
  let upsertMcpServerConfig;
  let resolveUserMcpJsonPath;
  let resolveMcpServerScriptPath;
  let createMcpServerConfigEntry;
  const tempRoot = path.resolve(__dirname, '../../.tmp-mcp-bootstrap-test');

  before(() => {
    ({
      upsertMcpServerConfig,
      resolveUserMcpJsonPath,
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

  it('resolveUserMcpJsonPath はLinuxのCode配下を解決できる', () => {
    const p = resolveUserMcpJsonPath({
      platform: 'linux',
      appName: 'Visual Studio Code',
      homeDir: '/home/test-user',
      env: {}
    });
    assert.strictEqual(p, '/home/test-user/.config/Code/User/mcp.json');
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
