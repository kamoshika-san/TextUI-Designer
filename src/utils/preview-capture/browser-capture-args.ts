import * as path from 'path';

/**
 * managed 向け chrome-headless-shell 等は既にヘッドレス専用のため --headless を付けない。
 * それ以外は従来どおり --headless=new → --headless の順で試行する。
 */
export function normalizeBrowserBasename(browserPath: string): string {
  return path.basename(browserPath).replace(/\.exe$/i, '').toLowerCase();
}

export function isHeadlessShellBinary(browserPath: string): boolean {
  const base = normalizeBrowserBasename(browserPath);
  return base.includes('chrome-headless-shell') || base.includes('headless-shell');
}

/**
 * 各試行の先頭に付けるヘッドレスフラグ。null は「付与しない（1 要素目は --disable-gpu から）」。
 */
export function resolveHeadlessFlagAttempts(browserPath: string): readonly (string | null)[] {
  if (isHeadlessShellBinary(browserPath)) {
    return [null];
  }
  return ['--headless=new', '--headless'];
}

export function formatHeadlessAttemptLabel(headlessPrefix: string | null): string {
  return headlessPrefix ?? 'none (headless-shell binary, no --headless flag)';
}

export function buildRunBrowserCaptureArgs(
  params: {
    width: number;
    height: number;
    scale: number;
    waitMs: number;
    outputPath: string;
    targetUrl: string;
    allowNoSandbox: boolean;
  },
  headlessPrefix: string | null,
  platform: NodeJS.Platform
): string[] {
  const args: string[] = [];
  if (headlessPrefix !== null) {
    args.push(headlessPrefix);
  }
  args.push(
    '--disable-gpu',
    '--hide-scrollbars',
    '--disable-extensions',
    `--window-size=${params.width},${params.height}`,
    `--force-device-scale-factor=${params.scale}`,
    `--virtual-time-budget=${params.waitMs}`,
    `--screenshot=${params.outputPath}`,
    params.targetUrl
  );

  if (platform === 'linux') {
    args.splice(1, 0, '--disable-dev-shm-usage');
    if (params.allowNoSandbox) {
      args.splice(1, 0, '--no-sandbox');
    }
  }

  return args;
}
