import * as fs from 'fs';
import { type CaptureLog, type PreviewCaptureResult } from './shared';

declare const __non_webpack_require__: NodeRequire | undefined;

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

function isPuppeteerDisabledByEnv(): boolean {
  const v = process.env.TEXTUI_CAPTURE_DISABLE_PUPPETEER;
  return v === '1' || v === 'true' || v === 'yes';
}

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

/**
 * puppeteer-core でページ全体をキャプチャ。失敗時は null を返し呼び出し元で CLI にフォールバックする。
 */
export async function runPuppeteerFullPageCapture(params: {
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

    currentPhase = 'expandScrollableContainersForCapture';
    await page.evaluate(expandScrollableContainersForCapture);

    currentPhase = 'scrollBottom';
    await page.evaluate(() => {
      window.scrollTo(0, 999999);
    });
    await new Promise(resolve => setTimeout(resolve, 200));

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

