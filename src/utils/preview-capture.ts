import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { spawn, spawnSync } from 'child_process';
import * as YAML from 'yaml';
import type { TextUIDSL } from '../renderer/types';
import { HtmlExporter } from '../exporters/html-exporter';

declare const __non_webpack_require__: NodeRequire | undefined;

export interface PreviewCaptureOptions {
  outputPath: string;
  themePath?: string;
  /** DSL ファイルパス（themePath 未指定時に同階層の textui-theme.yml を参照するために使用） */
  dslFilePath?: string;
  /** 拡張ルートパス。指定時は WebView と同一 CSS をキャプチャ用 HTML に使用 */
  extensionPath?: string;
  width?: number;
  height?: number;
  scale?: number;
  waitMs?: number;
  browserPath?: string;
  allowNoSandbox?: boolean;
  /** デバッグ用。拡張から呼ぶときに渡すと CLI spawn などの状況が出力される */
  log?: (message: string) => void;
  /** false のとき HTML は文字列レンダラーのみ（CLI で react が無い環境向け） */
  useReactRender?: boolean;
  /** 指定時は CLI spawn にこのパスを使う（開発時にワークスペースの CLI を優先） */
  cliSpawnPath?: string;
  /** true のとき themePath を WebView 適用中テーマのみとし、同階層の textui-theme.yml にはフォールバックしない */
  useWebViewTheme?: boolean;
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

type CaptureLog = (message: string) => void;

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



export function expandScrollableContainersForCapture(
  doc: Document = document,
  win: Window = window
): void {
  const docEl = doc.documentElement;
  const body = doc.body;
  if (!docEl || !body) {
    return;
  }

  const overflowRegex = /(auto|scroll|overlay)/;
  const scrollableContainers: HTMLElement[] = [];

  const allElements = Array.from(doc.querySelectorAll<HTMLElement>('*'));
  for (const element of allElements) {
    const style = win.getComputedStyle(element);
    const hasScrollableOverflow =
      overflowRegex.test(style.overflowY) || overflowRegex.test(style.overflow);
    const overflowAmount = element.scrollHeight - element.clientHeight;
    if (hasScrollableOverflow && overflowAmount > 1) {
      scrollableContainers.push(element);
    }
  }

  const expandElement = (target: HTMLElement): void => {
    target.style.setProperty('overflow', 'visible', 'important');
    target.style.setProperty('overflow-y', 'visible', 'important');
    target.style.setProperty('max-height', 'none', 'important');
    target.style.setProperty('height', 'auto', 'important');
  };

  expandElement(docEl);
  expandElement(body);

  for (const container of scrollableContainers) {
    expandElement(container);
  }
}

type PuppeteerLaunchOptions = {
  executablePath: string;
  headless: boolean;
  args: string[];
};

type PuppeteerModuleLike = {
  launch: (options: PuppeteerLaunchOptions) => Promise<PuppeteerBrowserLike>;
};

type CdpSessionLike = {
  send: <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>;
};

type PuppeteerPageLike = {
  setViewport: (viewport: { width: number; height: number; deviceScaleFactor: number }) => Promise<void>;
  goto: (url: string, options: { waitUntil: string; timeout: number }) => Promise<void>;
  evaluate: <T>(fn: () => T) => Promise<T>;
  screenshot: (options: { path: string; fullPage: boolean; type: 'png' }) => Promise<void>;
  createCDPSession?: () => Promise<CdpSessionLike>;
};

type PuppeteerBrowserLike = {
  newPage: () => Promise<PuppeteerPageLike>;
  close: () => Promise<void>;
};

function loadPuppeteerModule(): PuppeteerModuleLike | null {
  try {
    const moduleName = 'puppeteer-core';
    const runtimeRequire: NodeRequire =
      typeof __non_webpack_require__ === 'function' ? __non_webpack_require__ : require;
    return runtimeRequire(moduleName) as PuppeteerModuleLike;
  } catch {
    return null;
  }
}

function resolveThemePathForCapture(
  explicitThemePath: string | undefined,
  dslFilePath: string | undefined,
  useWebViewTheme?: boolean
): string | undefined {
  if (useWebViewTheme) {
    return (explicitThemePath && fs.existsSync(explicitThemePath)) ? explicitThemePath : undefined;
  }
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

  const themePath = resolveThemePathForCapture(
    options.themePath,
    options.dslFilePath,
    options.useWebViewTheme
  );
  const html = await new HtmlExporter().export(dsl, {
    format: 'html',
    themePath,
    useReactRender: options.useReactRender ?? true,
    extensionPath: options.extensionPath
  });
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-preview-capture-'));
  const htmlPath = path.join(tempDir, 'preview.html');

  try {
    fs.writeFileSync(htmlPath, html, 'utf8');
    const targetUrl = pathToFileURL(htmlPath).toString();

    options.log?.(`capture path: trying puppeteer full-page (url=${targetUrl}, width=${width}, height=${height}, waitMs=${waitMs})`);
    const puppeteerResult = await runPuppeteerFullPageCapture({
      browserPath,
      outputPath,
      width,
      height,
      scale,
      waitMs,
      allowNoSandbox,
      targetUrl,
      log: options.log
    });

    if (puppeteerResult) {
      options.log?.('capture path: puppeteer full-page succeeded');
      return puppeteerResult;
    }

    if (options.extensionPath && options.dslFilePath) {
      options.log?.(`Puppeteer failed, trying CLI spawn (extensionPath=${options.extensionPath}, dslFilePath=${options.dslFilePath})`);
      const cliSuccess = await runCaptureViaCli({
        extensionPath: options.extensionPath,
        cliSpawnPath: options.cliSpawnPath,
        dslFilePath: options.dslFilePath,
        outputPath,
        themePath,
        useWebViewTheme: options.useWebViewTheme,
        width,
        height,
        scale,
        waitMs,
        browserPath,
        allowNoSandbox,
        log: options.log
      });
      if (cliSuccess && fs.existsSync(outputPath)) {
        const image = fs.readFileSync(outputPath);
        if (image.length >= 8 && image.subarray(0, 4).equals(PNG_MAGIC)) {
          options.log?.('capture path: CLI spawn succeeded');
          return {
            outputPath,
            browserPath,
            width,
            height
          };
        }
        options.log?.('runCaptureViaCli: CLI exited 0 but output file missing or not valid PNG');
      } else {
        options.log?.('runCaptureViaCli: CLI failed or timed out');
      }
    }

    options.log?.('capture path: falling back to runBrowserCapture (viewport only)');
    const execution = await runBrowserCapture({
      browserPath,
      outputPath,
      width,
      height,
      scale,
      waitMs,
      allowNoSandbox,
      targetUrl,
      log: options.log
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
  log?: CaptureLog;
}): Promise<PreviewCaptureResult | null> {
  if (isPuppeteerDisabledByEnv()) {
    params.log?.('runPuppeteerFullPageCapture: skipped (disabled by TEXTUI_CAPTURE_DISABLE_PUPPETEER)');
    return null;
  }
  const puppeteer = loadPuppeteerModule();
  if (!puppeteer) {
    params.log?.('runPuppeteerFullPageCapture: skipped (puppeteer-core not available)');
    return null;
  }

  const launchOptions: PuppeteerLaunchOptions = {
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

  let browser: PuppeteerBrowserLike | undefined;
  let currentPhase = 'launch';
  try {
    currentPhase = 'launch';
    browser = await puppeteer.launch(launchOptions);
    currentPhase = 'newPage';
    const page = await browser.newPage();

    currentPhase = 'setViewport(initial)';
    await page.setViewport({
      width: params.width,
      height: params.height,
      deviceScaleFactor: params.scale
    });

    const isFileUrl = params.targetUrl.startsWith('file:');
    currentPhase = 'goto';
    await page.goto(params.targetUrl, {
      waitUntil: isFileUrl ? 'load' : 'networkidle0',
      timeout: Math.max(10000, params.waitMs + 5000)
    });

    currentPhase = 'wait';
    await new Promise(resolve => setTimeout(resolve, params.waitMs));

    // プレビュー CSS で内部スクロール（overflow:auto 等 + 固定高）があると、
    // fullPage スクリーンショットがビューポート分だけになる場合がある。
    // そのため、実際に縦方向へオーバーフローしているコンテナを一時的に展開してから撮影する。
    currentPhase = 'expandScrollableContainersForCapture';
    await page.evaluate(expandScrollableContainersForCapture);

    // 全コンテンツをレイアウトさせるため一度末尾へスクロールしてから高さを計測
    currentPhase = 'scrollBottom';
    await page.evaluate(() => {
      window.scrollTo(0, 999999);
    });
    await new Promise(resolve => setTimeout(resolve, 200));

    // 実コンテンツ高さを取得（body の min-height:100vh の影響を避けるため、コンテンツルートの scrollHeight を優先）
    currentPhase = 'measureDimensions';
    const dimensions = await page.evaluate(() => {
      const docEl = document.documentElement;
      const body = document.body;
      const root = body.firstElementChild as HTMLElement | null;
      const width = Math.max(docEl.scrollWidth, docEl.clientWidth, body.scrollWidth, body.clientWidth);
      const contentHeight = root ? root.offsetTop + root.scrollHeight : body.scrollHeight;
      const height = Math.max(contentHeight, docEl.scrollHeight, body.scrollHeight, docEl.clientHeight, body.clientHeight);
      return { width, height };
    });

    const viewportWidth = Math.max(dimensions.width, params.width);
    const viewportHeight = Math.min(Math.max(dimensions.height, params.height), 32767);
    params.log?.(
      `runPuppeteerFullPageCapture: measured dimensions width=${dimensions.width}, height=${dimensions.height}, viewportWidth=${viewportWidth}, viewportHeight=${viewportHeight}`
    );
    currentPhase = 'setViewport(fullPage)';
    await page.setViewport({
      width: viewportWidth,
      height: viewportHeight,
      deviceScaleFactor: params.scale
    });

    currentPhase = 'createCDPSession';
    const cdpSession = page.createCDPSession ? await page.createCDPSession().catch(() => null) : null;
    if (cdpSession) {
      type LayoutMetricsResponse = {
        contentSize?: {
          x?: number;
          y?: number;
          width?: number;
          height?: number;
        };
      };
      currentPhase = 'cdp.getLayoutMetrics';
      const metrics = await cdpSession.send<LayoutMetricsResponse>('Page.getLayoutMetrics');
      const clipWidth = Math.max(1, Math.ceil(metrics.contentSize?.width ?? viewportWidth));
      const clipHeight = Math.max(1, Math.ceil(metrics.contentSize?.height ?? viewportHeight));
      params.log?.(
        `runPuppeteerFullPageCapture: cdp contentSize width=${metrics.contentSize?.width ?? 0}, height=${metrics.contentSize?.height ?? 0}, clipWidth=${clipWidth}, clipHeight=${clipHeight}`
      );
      type CaptureScreenshotResponse = { data?: string };
      currentPhase = 'cdp.captureScreenshot';
      const captured = await cdpSession.send<CaptureScreenshotResponse>('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: true,
        clip: {
          x: 0,
          y: 0,
          width: clipWidth,
          height: clipHeight,
          scale: 1
        }
      });
      const base64 = captured.data;
      if (!base64) {
        throw new Error('capture failed: CDP screenshot returned empty payload');
      }
      currentPhase = 'writePng(cdp)';
      fs.writeFileSync(params.outputPath, Buffer.from(base64, 'base64'));
    } else {
      params.log?.('runPuppeteerFullPageCapture: CDP session unavailable, using page.screenshot(fullPage=true)');
      currentPhase = 'page.screenshot(fullPage)';
      await page.screenshot({
        path: params.outputPath,
        fullPage: true,
        type: 'png'
      });
    }

    const resultHeight = dimensions.height > 0 ? dimensions.height : params.height;
    return {
      outputPath: params.outputPath,
      browserPath: params.browserPath,
      width: dimensions.width,
      height: resultHeight
    };
  } catch (error) {
    const message = error instanceof Error ? `${error.message}${error.stack ? `\n${error.stack}` : ''}` : String(error);
    params.log?.(`runPuppeteerFullPageCapture: failed at phase=${currentPhase}\n${message}`);
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

async function runCaptureViaCli(params: {
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
  log?: (message: string) => void;
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

async function runBrowserCapture(params: {
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
