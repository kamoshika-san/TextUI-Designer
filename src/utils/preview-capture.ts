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
  width?: number;
  height?: number;
  scale?: number;
  waitMs?: number;
  browserPath?: string;
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

  const html = await new HtmlExporter().export(dsl, { format: 'html' });
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
  if (overridePath) {
    return overridePath;
  }

  const envPath = process.env.TEXTUI_CAPTURE_BROWSER_PATH;
  if (envPath) {
    return envPath;
  }

  const candidates = getPlatformBrowserCandidates();

  for (const candidate of candidates) {
    if (canExecuteBrowser(candidate)) {
      return candidate;
    }
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

async function runBrowserCapture(params: {
  browserPath: string;
  outputPath: string;
  width: number;
  height: number;
  scale: number;
  waitMs: number;
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
      args.splice(1, 0, '--no-sandbox', '--disable-dev-shm-usage');
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
