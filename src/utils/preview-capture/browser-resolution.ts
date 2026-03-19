import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

const ALLOWED_BROWSER_COMMANDS = new Set([
  'google-chrome',
  'google-chrome-stable',
  'chromium-browser',
  'chromium',
  'microsoft-edge',
  'chrome.exe',
  'msedge.exe'
]);

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

export function resolveBrowserPath(overridePath?: string): string {
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

