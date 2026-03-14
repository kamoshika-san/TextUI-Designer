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
  /** DSL ファイルパス（themePath 未指定時に同階層の textui-theme.yml を参照するために使用） */
  dslFilePath?: string;
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
const THEME_FILENAMES = ['textui-theme.yml', 'textui-theme.yaml'];

function resolveThemePathForCapture(explicitThemePath?: string, dslFilePath?: string): string | undefined {
  if (explicitThemePath && fs.existsSync(explicitThemePath)) {
    return explicitThemePath;
  }
  if (!dslFilePath) {
    return undefined;
  }
  const dir = path.dirname(dslFilePath);
  for (const name of THEME_FILENAMES) {
    const candidate = path.join(dir, name);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

export async function capturePreviewImageFromDslFile(
  dslFilePath: string,
  options: PreviewCaptureOptions
): Promise<PreviewCaptureResult> {
  const sourcePath = path.resolve(dslFilePath);
  const raw = fs.readFileSync(sourcePath, 'utf8');
  const dsl = YAML.parse(raw) as TextUIDSL;
  return capturePreviewImageFromDsl(dsl, { ...options, dslFilePath: sourcePath });
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

  const themePath = resolveThemePathForCapture(options.themePath, options.dslFilePath);
  const html = await new HtmlExporter().export(dsl, {
    format: 'html',
    themePath
  });
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-preview-capture-'));
  const htmlPath = path.join(tempDir, 'preview.html');

  try {
    fs.writeFileSync(htmlPath, html, 'utf8');
    const targetUrl = pathToFileURL(htmlPath).toString();

    const puppeteerResult = await runPuppeteerFullPageCapture({
      browserPath,
      outputPath,
      width,
      height,
      scale,
      waitMs,
      allowNoSandbox,
      targetUrl
    });

    if (puppeteerResult) {
      return puppeteerResult;
    }

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

function isPuppeteerDisabledByEnv(): boolean {
  const v = process.env.TEXTUI_CAPTURE_DISABLE_PUPPETEER;
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * puppeteer-core でページ全体をキャプチャ。失敗時は null を返し呼び出し元で CLI にフォールバックする。
 */
async function runPuppeteerFullPageCapture(params: {
  browserPath: string;
  outputPath: string;
  width: number;
  height: number;
  scale: number;
  waitMs: number;
  allowNoSandbox: boolean;
  targetUrl: string;
}): Promise<PreviewCaptureResult | null> {
  if (isPuppeteerDisabledByEnv()) {
    return null;
  }
  let puppeteer: typeof import('puppeteer-core');
  try {
    puppeteer = await import('puppeteer-core');
  } catch {
    return null;
  }

  const launchOptions: import('puppeteer-core').LaunchOptions = {
    executablePath: params.browserPath,
    headless: true,
    args: [
      '--disable-gpu',
      '--hide-scrollbars',
      '--disable-extensions',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  };

  let browser: import('puppeteer-core').Browser | undefined;
  try {
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    await page.setViewport({
      width: params.width,
      height: params.height,
      deviceScaleFactor: params.scale
    });

    await page.goto(params.targetUrl, {
      waitUntil: 'networkidle0',
      timeout: Math.max(10000, params.waitMs + 5000)
    });

    await new Promise(resolve => setTimeout(resolve, params.waitMs));

    const dimensions = await page.evaluate(() => ({
      width: Math.max(document.documentElement.scrollWidth, document.documentElement.clientWidth),
      height: Math.max(document.documentElement.scrollHeight, document.documentElement.clientHeight)
    }));

    const viewportWidth = Math.max(dimensions.width, params.width);
    const viewportHeight = Math.min(dimensions.height, 32767);
    await page.setViewport({
      width: viewportWidth,
      height: Math.min(viewportHeight, 800),
      deviceScaleFactor: params.scale
    });

    await page.screenshot({
      path: params.outputPath,
      fullPage: true,
      type: 'png'
    });

    const resultHeight = dimensions.height > 0 ? dimensions.height : params.height;
    return {
      outputPath: params.outputPath,
      browserPath: params.browserPath,
      width: dimensions.width,
      height: resultHeight
    };
  } catch {
    return null;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/** テスト用: TEXTUI_CAPTURE_EXTRA_TRUSTED_PATHS のカンマ区切りパスを解決して返す */
function parseExtraTrustedPaths(envValue: string | undefined): string[] {
  if (!envValue || typeof envValue !== 'string') {
    return [];
  }
  const paths: string[] = [];
  for (const raw of envValue.split(',').map(s => s.trim()).filter(Boolean)) {
    const resolved = resolvePathCandidate(raw);
    if (resolved && isAllowedBrowserBasename(path.basename(resolved))) {
      paths.push(resolved);
    }
  }
  return paths;
}

function resolveBrowserPath(overridePath?: string): string {
  const trustedBrowserPaths = discoverTrustedBrowserPaths();
  const extraPaths = parseExtraTrustedPaths(process.env.TEXTUI_CAPTURE_EXTRA_TRUSTED_PATHS);
  const trustedPathSet = new Set([...trustedBrowserPaths, ...extraPaths]);

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
  // Windows: spawnSync(..., ['--version']) は Edge/Chrome のウィンドウを一瞬表示するため、存在チェックのみ行う。
  // キャプチャは Playwright の chrome-headless-shell を使用するため、発見結果は表示用・フォールバック用で実行可否の厳密判定は不要。
  if ((process.platform as NodeJS.Platform) === 'win32') {
    return fs.existsSync(candidate);
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
  const skipExecCheck = process.env.TEXTUI_CAPTURE_SKIP_EXECUTABLE_CHECK === '1'
    || process.env.TEXTUI_CAPTURE_SKIP_EXECUTABLE_CHECK === 'true';
  if (!skipExecCheck && !canExecuteBrowser(resolvedPath)) {
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
    || normalized === 'google-chrome.cmd'
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

    const maxExecutionMs = Math.max(15000, params.waitMs + 10000);
    const execution = await runProcess(params.browserPath, args, maxExecutionMs);
    if (execution.code === 0) {
      return execution;
    }
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
