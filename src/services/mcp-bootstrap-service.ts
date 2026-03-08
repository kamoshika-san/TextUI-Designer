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
    const scope = config.get<McpScope>('mcp.scope', 'workspace');
    const targets = this.resolveTargets(scope);

    if (targets.length === 0) {
      return {
        updated: false,
        updatedFiles: [],
        reason: 'no writable mcp.json target'
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
    const updatedFiles = targets.filter(target => upsertMcpServerConfig(target, serverId, entry));
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

  private resolveTargets(scope: McpScope): string[] {
    const targets = new Set<string>();

    if (scope === 'workspace' || scope === 'both') {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) {
        targets.add(path.join(workspaceFolder.uri.fsPath, '.vscode', 'mcp.json'));
      }
    }

    if (scope === 'user' || scope === 'both') {
      targets.add(resolveUserMcpJsonPath({
        platform: process.platform,
        appName: vscode.env.appName
      }));
    }

    return Array.from(targets);
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
