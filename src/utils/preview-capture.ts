import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { spawn, spawnSync } from 'child_process';
import * as YAML from 'yaml';
import type { TextUIDSL } from '../renderer/types';
import { HtmlExporter } from '../exporters/html-exporter';

export interface PreviewCaptureOptions {
  outputPath: string;
  themePath?: string;
  width?: number;
  height?: number;
  scale?: number;
  waitMs?: number;
  browserPath?: string;
  allowNoSandbox?: boolean;
}

export interface PreviewCaptureResult {
  outputPath: string;
  browserPath: string;
  width: number;
  height: number;
}

interface CaptureExecutionResult {
  code: number;
  stdout: string;
  stderr: string;
}

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;
const DEFAULT_SCALE = 1;
const DEFAULT_WAIT_MS = 3000;
const ALLOWED_BROWSER_COMMANDS = new Set([
  'google-chrome',
  'google-chrome-stable',
  'chromium-browser',
  'chromium',
  'microsoft-edge',
  'chrome.exe',
  'msedge.exe'
]);

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

export async function capturePreviewImageFromDslFile(
  dslFilePath: string,
  options: PreviewCaptureOptions
): Promise<PreviewCaptureResult> {
  const sourcePath = path.resolve(dslFilePath);
  const raw = fs.readFileSync(sourcePath, 'utf8');
  const dsl = YAML.parse(raw) as TextUIDSL;
  return capturePreviewImageFromDsl(dsl, options);
}

export async function capturePreviewImageFromDsl(
  dsl: TextUIDSL,
  options: PreviewCaptureOptions
): Promise<PreviewCaptureResult> {
  const outputPath = path.resolve(options.outputPath);
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  const scale = options.scale ?? DEFAULT_SCALE;
  const waitMs = options.waitMs ?? DEFAULT_WAIT_MS;
  const allowNoSandbox = options.allowNoSandbox ?? parseBooleanEnv(process.env.TEXTUI_CAPTURE_ALLOW_NO_SANDBOX);

  if (width <= 0 || height <= 0) {
    throw new Error(`width/height must be positive: width=${width}, height=${height}`);
  }
  if (scale <= 0) {
    throw new Error(`scale must be positive: scale=${scale}`);
  }
  if (waitMs < 0) {
    throw new Error(`waitMs must be >= 0: waitMs=${waitMs}`);
  }

  const browserPath = resolveBrowserPath(options.browserPath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const html = await new HtmlExporter().export(dsl, {
    format: 'html',
    themePath: options.themePath
  });
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-preview-capture-'));
  const htmlPath = path.join(tempDir, 'preview.html');

  try {
    fs.writeFileSync(htmlPath, html, 'utf8');
    const targetUrl = pathToFileURL(htmlPath).toString();
    const execution = await runBrowserCapture({
      browserPath,
      outputPath,
      width,
      height,
      scale,
      waitMs,
      allowNoSandbox,
      targetUrl
    });

    if (execution.code !== 0) {
      throw new Error(`capture failed (code=${execution.code}): ${execution.stderr || execution.stdout}`.trim());
    }
    if (!fs.existsSync(outputPath)) {
      throw new Error('capture failed: output image was not created');
    }
    const image = fs.readFileSync(outputPath);
    if (image.length < 8 || !image.subarray(0, 4).equals(PNG_MAGIC)) {
      throw new Error('capture failed: output file is not a PNG image');
    }

    return {
      outputPath,
      browserPath,
      width,
      height
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function resolveBrowserPath(overridePath?: string): string {
  const trustedBrowserPaths = discoverTrustedBrowserPaths();
  const trustedPathSet = new Set(trustedBrowserPaths);

  if (overridePath) {
    return resolveAndValidateBrowserOverride(overridePath, trustedPathSet, '--browser');
  }

  const envPath = process.env.TEXTUI_CAPTURE_BROWSER_PATH;
  if (envPath) {
    return resolveAndValidateBrowserOverride(envPath, trustedPathSet, 'TEXTUI_CAPTURE_BROWSER_PATH');
  }

  if (trustedBrowserPaths.length > 0) {
    return trustedBrowserPaths[0];
  }

  throw new Error(
    'headless browser not found. set --browser or TEXTUI_CAPTURE_BROWSER_PATH (supported: chrome/chromium/edge)'
  );
}

function getPlatformBrowserCandidates(): string[] {
  if (process.platform === 'win32') {
    return [
      'chrome.exe',
      'msedge.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
  }
  if (process.platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      'google-chrome',
      'chromium',
      'microsoft-edge'
    ];
  }
  return [
    'google-chrome',
    'google-chrome-stable',
    'chromium-browser',
    'chromium',
    'microsoft-edge'
  ];
}

function canExecuteBrowser(candidate: string): boolean {
  if (isPathLike(candidate) && !fs.existsSync(candidate)) {
    return false;
  }
  try {
    const result = spawnSync(candidate, ['--version'], { stdio: 'ignore' });
    return result.status === 0;
  } catch {
    return false;
  }
}

function isPathLike(value: string): boolean {
  return value.includes('/') || value.includes('\\');
}

function parseBooleanEnv(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function discoverTrustedBrowserPaths(): string[] {
  const trusted = new Set<string>();
  for (const candidate of getPlatformBrowserCandidates()) {
    if (isPathLike(candidate)) {
      const resolvedPath = resolvePathCandidate(candidate);
      if (resolvedPath && canExecuteBrowser(resolvedPath) && isAllowedBrowserBasename(path.basename(resolvedPath))) {
        trusted.add(resolvedPath);
      }
      continue;
    }

    if (!ALLOWED_BROWSER_COMMANDS.has(candidate)) {
      continue;
    }
    const executablePath = resolveExecutableCommand(candidate);
    if (!executablePath) {
      continue;
    }
    if (!canExecuteBrowser(executablePath) || !isAllowedBrowserBasename(path.basename(executablePath))) {
      continue;
    }
    trusted.add(executablePath);
  }
  return Array.from(trusted);
}

function resolveAndValidateBrowserOverride(
  overrideValue: string,
  trustedPathSet: Set<string>,
  sourceLabel: '--browser' | 'TEXTUI_CAPTURE_BROWSER_PATH'
): string {
  const candidate = overrideValue.trim();
  if (!candidate) {
    throw new Error(`${sourceLabel} must not be empty`);
  }

  const resolvedPath = isPathLike(candidate)
    ? resolvePathCandidate(candidate)
    : resolveExecutableCommand(candidate);

  if (!resolvedPath) {
    throw new Error(`${sourceLabel} could not be resolved: ${candidate}`);
  }
  if (!isAllowedBrowserBasename(path.basename(resolvedPath))) {
    throw new Error(`${sourceLabel} is not an allowed browser executable: ${candidate}`);
  }
  if (!trustedPathSet.has(resolvedPath)) {
    throw new Error(`${sourceLabel} is not in trusted browser allowlist: ${candidate}`);
  }
  if (!canExecuteBrowser(resolvedPath)) {
    throw new Error(`${sourceLabel} is not executable as browser: ${candidate}`);
  }
  return resolvedPath;
}

function resolvePathCandidate(candidatePath: string): string | null {
  const absolutePath = path.resolve(candidatePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }
  try {
    return fs.realpathSync(absolutePath);
  } catch {
    return null;
  }
}

function resolveExecutableCommand(commandName: string): string | null {
  const resolver = process.platform === 'win32' ? 'where' : 'which';
  try {
    const result = spawnSync(resolver, [commandName], { encoding: 'utf8' });
    if (result.status !== 0) {
      return null;
    }
    const firstLine = result.stdout
      .split(/\r?\n/)
      .map(line => line.trim())
      .find(Boolean);
    if (!firstLine) {
      return null;
    }
    return resolvePathCandidate(firstLine);
  } catch {
    return null;
  }
}

function isAllowedBrowserBasename(fileName: string): boolean {
  const normalized = fileName.toLowerCase();
  return normalized === 'google-chrome'
    || normalized === 'google-chrome-stable'
    || normalized === 'chromium-browser'
    || normalized === 'chromium'
    || normalized === 'microsoft-edge'
    || normalized === 'chrome.exe'
    || normalized === 'msedge.exe';
}

async function runBrowserCapture(params: {
  browserPath: string;
  outputPath: string;
  width: number;
  height: number;
  scale: number;
  waitMs: number;
  allowNoSandbox: boolean;
  targetUrl: string;
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

    const execution = await runProcess(params.browserPath, args);
    if (execution.code === 0) {
      return execution;
    }
    lastResult = execution;
  }

  return lastResult ?? { code: 1, stdout: '', stderr: 'unknown browser execution error' };
}

function runProcess(command: string, args: string[]): Promise<CaptureExecutionResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });
    child.on('error', error => {
      reject(error);
    });
    child.on('close', code => {
      resolve({
        code: code ?? 1,
        stdout,
        stderr
      });
    });
  });
}
