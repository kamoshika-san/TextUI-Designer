import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

export type McpScope = 'workspace' | 'user' | 'both';
export const DEFAULT_MCP_COMMAND = 'node';

export interface McpServerConfigEntry {
  type: 'stdio';
  command: string;
  args: string[];
  cwd?: string;
}

interface McpConfigFile {
  servers: Record<string, McpServerConfigEntry | Record<string, unknown>>;
  [key: string]: unknown;
}

interface McpTargetFile {
  kind: 'mcp-json' | 'codex-toml';
  filePath: string;
}

export interface McpBootstrapResult {
  updated: boolean;
  updatedFiles: string[];
  reason?: string;
}

export function resolveMcpServerScriptPath(extensionPath: string): string {
  return path.join(extensionPath, 'out', 'mcp', 'server.js');
}

export function createMcpServerConfigEntry(params: {
  extensionPath: string;
  command?: string;
}): McpServerConfigEntry {
  const command = (params.command ?? DEFAULT_MCP_COMMAND).trim() || DEFAULT_MCP_COMMAND;
  return {
    type: 'stdio',
    command,
    args: [resolveMcpServerScriptPath(params.extensionPath)],
    cwd: params.extensionPath
  };
}
export function resolveUserMcpJsonPath(options: {
  platform: NodeJS.Platform;
  appName?: string;
  homeDir?: string;
  env?: NodeJS.ProcessEnv;
}): string {
  const env = options.env ?? process.env;
  const home = options.homeDir ?? os.homedir();
  const product = resolveProductDirectoryName(options.appName);

  if (options.platform === 'win32') {
    const appData = env.APPDATA ?? path.join(home, 'AppData', 'Roaming');
    return path.join(appData, product, 'User', 'mcp.json');
  }
  if (options.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', product, 'User', 'mcp.json');
  }

  const configRoot = env.XDG_CONFIG_HOME
    ? path.resolve(env.XDG_CONFIG_HOME)
    : path.join(home, '.config');
  return path.join(configRoot, product, 'User', 'mcp.json');
}

export function resolveUserCodexConfigPath(options: {
  homeDir?: string;
  env?: NodeJS.ProcessEnv;
}): string {
  const env = options.env ?? process.env;
  const home = options.homeDir ?? os.homedir();
  const codexHome = env.CODEX_HOME
    ? path.resolve(env.CODEX_HOME)
    : path.join(home, '.codex');
  return path.join(codexHome, 'config.toml');
}

export function upsertMcpServerConfig(
  filePath: string,
  serverId: string,
  serverConfig: McpServerConfigEntry
): boolean {
  const current = readConfig(filePath);
  const next: McpConfigFile = {
    ...current,
    servers: {
      ...(current.servers ?? {}),
      [serverId]: serverConfig
    }
  };

  if (stableJson(current) === stableJson(next)) {
    return false;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return true;
}

export function upsertCodexServerConfig(
  filePath: string,
  serverId: string,
  serverConfig: McpServerConfigEntry
): boolean {
  const tableName = `mcp_servers.${serverId}`;
  const lines = [
    `[${tableName}]`,
    `command = ${toTomlString(serverConfig.command)}`,
    `args = ${toTomlStringArray(serverConfig.args)}`
  ];
  const sectionText = `${lines.join('\n')}\n`;

  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const next = upsertTomlSection(current, tableName, sectionText);
  if (current === next) {
    return false;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, next, 'utf8');
  return true;
}

export class McpBootstrapService {
  private readonly context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async ensureConfigured(): Promise<McpBootstrapResult> {
    const config = vscode.workspace.getConfiguration('textui-designer');
    const autoConfigure = config.get<boolean>('mcp.autoConfigure', true);
    if (!autoConfigure) {
      return {
        updated: false,
        updatedFiles: [],
        reason: 'autoConfigure disabled'
      };
    }

    const serverId = config.get<string>('mcp.serverId', 'textui-designer');
    const scope = config.get<McpScope>('mcp.scope', 'both');
    const targets = this.resolveTargets(scope);

    if (targets.length === 0) {
      return {
        updated: false,
        updatedFiles: [],
        reason: 'no writable MCP config target'
      };
    }

    const serverScriptPath = resolveMcpServerScriptPath(this.context.extensionPath);
    if (!fs.existsSync(serverScriptPath)) {
      return {
        updated: false,
        updatedFiles: [],
        reason: `mcp server script missing: ${serverScriptPath}`
      };
    }

    const command = config.get<string>('mcp.command', DEFAULT_MCP_COMMAND);
    const entry = this.createServerEntry(command);
    const updatedFiles = targets
      .filter(target => this.upsertTargetConfig(target, serverId, entry))
      .map(target => target.filePath);
    if (updatedFiles.length > 0) {
      const notifyOnConfigured = config.get<boolean>('mcp.notifyOnConfigured', true);
      if (notifyOnConfigured) {
        void vscode.window.showInformationMessage(
          `TextUI Designer MCP設定を更新しました (${updatedFiles.join(', ')})`
        );
      }
    }

    return {
      updated: updatedFiles.length > 0,
      updatedFiles
    };
  }

  private createServerEntry(command: string): McpServerConfigEntry {
    return createMcpServerConfigEntry({
      extensionPath: this.context.extensionPath,
      command
    });
  }

  private resolveTargets(scope: McpScope): McpTargetFile[] {
    const targets = new Map<string, McpTargetFile>();

    if (scope === 'workspace' || scope === 'both') {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) {
        const workspaceRoot = workspaceFolder.uri.fsPath;
        const mcpJson = path.join(workspaceRoot, '.vscode', 'mcp.json');
        const codexToml = path.join(workspaceRoot, '.codex', 'config.toml');
        targets.set(mcpJson, { kind: 'mcp-json', filePath: mcpJson });
        targets.set(codexToml, { kind: 'codex-toml', filePath: codexToml });
      }
    }

    if (scope === 'user' || scope === 'both') {
      const userMcpJson = resolveUserMcpJsonPath({
        platform: process.platform,
        appName: vscode.env.appName
      });
      const userCodexToml = resolveUserCodexConfigPath({});
      targets.set(userMcpJson, { kind: 'mcp-json', filePath: userMcpJson });
      targets.set(userCodexToml, { kind: 'codex-toml', filePath: userCodexToml });
    }

    return Array.from(targets.values());
  }

  private upsertTargetConfig(target: McpTargetFile, serverId: string, entry: McpServerConfigEntry): boolean {
    if (target.kind === 'codex-toml') {
      return upsertCodexServerConfig(target.filePath, serverId, entry);
    }
    return upsertMcpServerConfig(target.filePath, serverId, entry);
  }
}

function resolveProductDirectoryName(appName?: string): string {
  const normalized = (appName ?? '').toLowerCase();
  if (normalized.includes('insiders')) {
    return 'Code - Insiders';
  }
  if (normalized.includes('cursor')) {
    return 'Cursor';
  }
  if (normalized.includes('vscodium')) {
    return 'VSCodium';
  }
  if (normalized.includes('code - oss') || normalized.includes('oss')) {
    return 'Code - OSS';
  }
  return 'Code';
}

function readConfig(filePath: string): McpConfigFile {
  if (!fs.existsSync(filePath)) {
    return { servers: {} };
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<McpConfigFile>;
    if (!parsed || typeof parsed !== 'object') {
      return { servers: {} };
    }
    const servers = (parsed.servers && typeof parsed.servers === 'object' && !Array.isArray(parsed.servers))
      ? parsed.servers
      : {};
    return {
      ...parsed,
      servers
    } as McpConfigFile;
  } catch {
    return { servers: {} };
  }
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortRecursively(value));
}

function sortRecursively(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => sortRecursively(item));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  Object.keys(input).sort().forEach(key => {
    output[key] = sortRecursively(input[key]);
  });
  return output;
}

function toTomlString(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function toTomlStringArray(values: string[]): string {
  return `[${values.map(item => toTomlString(item)).join(', ')}]`;
}

function upsertTomlSection(content: string, tableName: string, sectionText: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const targetHeader = `[${tableName}]`;
  const start = lines.findIndex(line => line.trim() === targetHeader);

  if (start === -1) {
    const trimmed = normalized.trimEnd();
    const prefix = trimmed.length === 0 ? '' : `${trimmed}\n\n`;
    return `${prefix}${sectionText}`;
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].trim().startsWith('[')) {
      end = i;
      break;
    }
  }

  const before = lines.slice(0, start).join('\n').replace(/\n+$/g, '');
  const after = lines.slice(end).join('\n').replace(/^\n+/g, '');
  if (!before && !after) {
    return sectionText;
  }
  if (!before) {
    return `${sectionText}\n${after}`.replace(/\n{3,}/g, '\n\n');
  }
  if (!after) {
    return `${before}\n\n${sectionText}`.replace(/\n{3,}/g, '\n\n');
  }
  return `${before}\n\n${sectionText}\n${after}`.replace(/\n{3,}/g, '\n\n');
}
