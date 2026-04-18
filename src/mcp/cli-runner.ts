import * as path from 'path';
import { spawn } from 'child_process';

export interface CliRunRequest {
  args: string[] | undefined;
  cwd?: string;
  timeoutMs?: number;
  parseJson?: boolean;
}

export interface CliRunResponse {
  command: string;
  cwd: string;
  exitCode: number;
  timedOut: boolean;
  stdout: string;
  stderr: string;
  parsedJson?: unknown;
}

const CLI_SUPPORTED_ROOT_COMMANDS = new Set([
  'validate',
  'plan',
  'apply',
  'export',
  'flow',
  'capture',
  'import',
  'state',
  'providers',
  'version',
  'help',
  '--help',
  '-h'
]);

function normalizePathForContainmentCheck(targetPath: string): string {
  const normalized = path.resolve(targetPath);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function isWithinProjectDirectory(baseCwd: string, targetCwd: string): boolean {
  const normalizedBase = normalizePathForContainmentCheck(baseCwd);
  const normalizedTarget = normalizePathForContainmentCheck(targetCwd);

  return normalizedTarget === normalizedBase
    || normalizedTarget.startsWith(normalizedBase + path.sep);
}

export class CliRunner {
  async run(request: CliRunRequest): Promise<CliRunResponse> {
    const { args } = request;
    if (!args || args.length === 0) {
      throw new Error('run_cli requires args (string[])');
    }

    const rootCommand = args[0];
    if (!CLI_SUPPORTED_ROOT_COMMANDS.has(rootCommand)) {
      throw new Error(`run_cli unsupported command: ${rootCommand}`);
    }
    if (rootCommand === 'capture' && hasForbiddenCaptureArg(args)) {
      throw new Error('run_cli capture does not allow --browser or --allow-no-sandbox via MCP');
    }

    const baseCwd = process.cwd();
    const resolvedCwd = request.cwd ? path.resolve(request.cwd) : baseCwd;
    if (!isWithinProjectDirectory(baseCwd, resolvedCwd)) {
      throw new Error(`run_cli cwd must be within the project directory: ${resolvedCwd}`);
    }
    const cwd = resolvedCwd;
    const timeoutMs = request.timeoutMs ?? 120000;
    const parseJson = request.parseJson ?? true;
    const cliEntry = path.resolve(__dirname, '../cli/index.js');
    const nodeArgs = [cliEntry, ...args];

    const { code, stdout, stderr, timedOut } = await new Promise<{
      code: number;
      stdout: string;
      stderr: string;
      timedOut: boolean;
    }>((resolve, reject) => {
      const child = spawn(process.execPath, nodeArgs, {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let timeoutHandle: NodeJS.Timeout | undefined;

      if (timeoutMs > 0) {
        timeoutHandle = setTimeout(() => {
          timedOut = true;
          child.kill('SIGTERM');
        }, timeoutMs);
      }

      child.stdout.on('data', chunk => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', chunk => {
        stderr += chunk.toString();
      });
      child.on('error', error => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        reject(error);
      });
      child.on('close', code => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        resolve({
          code: code ?? (timedOut ? 124 : 1),
          stdout,
          stderr,
          timedOut
        });
      });
    });

    const response: CliRunResponse = {
      command: `textui ${args.join(' ')}`.trim(),
      cwd,
      exitCode: code,
      timedOut,
      stdout,
      stderr
    };

    if (parseJson) {
      const trimmed = stdout.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          response.parsedJson = JSON.parse(trimmed) as unknown;
        } catch {
          // 非JSON出力の場合はparsedJsonを未設定のまま返す
        }
      }
    }

    return response;
  }
}

function hasForbiddenCaptureArg(args: string[]): boolean {
  return args.some(arg =>
    arg === '--browser'
    || arg.startsWith('--browser=')
    || arg === '--allow-no-sandbox'
  );
}
