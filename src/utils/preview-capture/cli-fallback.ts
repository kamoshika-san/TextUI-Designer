import * as fs from 'fs';
import * as path from 'path';
import { spawn, spawnSync } from 'child_process';
import type { CaptureExecutionResult, CaptureLog } from './shared';

function resolveNodeCommand(): string {
  const base = path.basename(process.execPath).toLowerCase();
  if (base === 'node' || base === 'node.exe') {
    return process.execPath;
  }
  try {
    if (process.platform === 'win32') {
      const r = spawnSync('where', ['node'], { encoding: 'utf-8', windowsHide: true });
      const line = r.stdout?.split(/\r?\n/)[0]?.trim();
      if (line && fs.existsSync(line)) {
        return line;
      }
    } else {
      const r = spawnSync('which', ['node'], { encoding: 'utf-8' });
      const line = r.stdout?.trim();
      if (line && fs.existsSync(line)) {
        return line;
      }
    }
  } catch {
    // fallback
  }
  return 'node';
}

export async function runCaptureViaCli(params: {
  extensionPath: string;
  /** 指定時はここから CLI を起動（開発時はワークスペースの out/cli を優先） */
  cliSpawnPath?: string;
  dslFilePath: string;
  outputPath: string;
  themePath?: string;
  useWebViewTheme?: boolean;
  width: number;
  height: number;
  scale: number;
  waitMs: number;
  browserPath: string;
  allowNoSandbox: boolean;
  log?: CaptureLog;
}): Promise<boolean> {
  const cliRoot = params.cliSpawnPath ?? params.extensionPath;
  const cliScript = path.join(cliRoot, 'out', 'cli', 'index.js');
  if (!fs.existsSync(cliScript)) {
    params.log?.(`runCaptureViaCli: CLI script not found: ${cliScript}`);
    return false;
  }
  const nodeCommand = resolveNodeCommand();
  params.log?.(`runCaptureViaCli: node=${nodeCommand}, script=${cliScript}, extensionPath=${params.extensionPath}`);
  const args: string[] = [
    cliScript,
    'capture',
    '--file', params.dslFilePath,
    '--output', params.outputPath,
    '--extension-path', params.extensionPath
  ];
  if (params.useWebViewTheme) {
    args.push('--use-webview-theme');
  }
  if (params.themePath) {
    args.push('--theme', params.themePath);
  }
  if (params.browserPath) {
    args.push('--browser', params.browserPath);
  }
  if (params.allowNoSandbox) {
    args.push('--allow-no-sandbox');
  }
  args.push('--width', String(params.width));
  args.push('--height', String(params.height));
  args.push('--scale', String(params.scale));
  args.push('--wait-ms', String(params.waitMs));

  const timeoutMs = Math.max(120000, params.waitMs + 60000);
  const env = { ...process.env };
  const nodeModules = path.join(cliRoot, 'node_modules');
  if (fs.existsSync(nodeModules)) {
    env.NODE_PATH = nodeModules;
  }

  const result = await new Promise<{ code: number | null; stderr: string; stdout: string; timedOut: boolean }>((resolve) => {
    let stderr = '';
    let stdout = '';
    const cwd = cliRoot;
    const child = spawn(nodeCommand, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform === 'win32'
    });
    let settled = false;
    const timeoutHandle = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill('SIGKILL');
      params.log?.(`runCaptureViaCli: timed out after ${timeoutMs}ms`);
      resolve({ code: null, stderr, stdout, timedOut: true });
    }, timeoutMs);
    child.stderr?.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.stdout?.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.on('error', (err) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutHandle);
      params.log?.(`runCaptureViaCli: spawn error: ${err.message}`);
      resolve({ code: null, stderr: err.message, stdout, timedOut: false });
    });
    child.on('close', (code, signal) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutHandle);
      if (code !== 0) {
        params.log?.(
          `runCaptureViaCli: exit code=${code}, signal=${String(signal)}, stdout=${stdout.slice(0, 1000)}, stderr=${stderr.slice(0, 1000)}`
        );
      }
      resolve({ code: code ?? null, stderr, stdout, timedOut: false });
    });
  });

  if (result.code === 0) {
    params.log?.('runCaptureViaCli: completed successfully');
  } else if (!result.timedOut) {
    params.log?.('runCaptureViaCli: failed');
  }
  return result.code === 0;
}

export async function runBrowserCapture(params: {
  browserPath: string;
  outputPath: string;
  width: number;
  height: number;
  scale: number;
  waitMs: number;
  allowNoSandbox: boolean;
  targetUrl: string;
  log?: CaptureLog;
}): Promise<CaptureExecutionResult> {
  const headlessModes = ['--headless=new', '--headless'];
  let lastResult: CaptureExecutionResult | null = null;

  for (const headlessMode of headlessModes) {
    const args: string[] = [
      headlessMode,
      '--disable-gpu',
      '--hide-scrollbars',
      '--disable-extensions',
      `--window-size=${params.width},${params.height}`,
      `--force-device-scale-factor=${params.scale}`,
      `--virtual-time-budget=${params.waitMs}`,
      `--screenshot=${params.outputPath}`,
      params.targetUrl
    ];

    if (process.platform === 'linux') {
      args.splice(1, 0, '--disable-dev-shm-usage');
      if (params.allowNoSandbox) {
        args.splice(1, 0, '--no-sandbox');
      }
    }

    const maxExecutionMs = Math.max(15000, params.waitMs + 10000);
    params.log?.(`runBrowserCapture: trying mode=${headlessMode}, timeoutMs=${maxExecutionMs}`);
    const execution = await runProcess(params.browserPath, args, maxExecutionMs);
    if (execution.code === 0) {
      params.log?.(`runBrowserCapture: mode=${headlessMode} succeeded`);
      return execution;
    }
    params.log?.(
      `runBrowserCapture: mode=${headlessMode} failed code=${execution.code}, stdout=${execution.stdout.slice(0, 1000)}, stderr=${execution.stderr.slice(0, 1000)}`
    );
    lastResult = execution;
  }

  return lastResult ?? { code: 1, stdout: '', stderr: 'unknown browser execution error' };
}

function runProcess(command: string, args: string[], timeoutMs: number): Promise<CaptureExecutionResult> {
  const useShell = process.platform === 'win32'
    && (command.toLowerCase().endsWith('.cmd') || command.toLowerCase().endsWith('.bat'));
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: useShell });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timeoutHandle = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill('SIGKILL');
      resolve({
        code: 1,
        stdout,
        stderr: `${stderr}capture failed: browser process timed out after ${timeoutMs}ms`.trim()
      });
    }, timeoutMs);

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });
    child.on('error', error => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutHandle);
      reject(error);
    });
    child.on('close', code => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutHandle);
      resolve({
        code: code ?? 1,
        stdout,
        stderr
      });
    });
  });
}

