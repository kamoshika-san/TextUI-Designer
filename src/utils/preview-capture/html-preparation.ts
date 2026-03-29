import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pathToFileURL } from 'url';
import type { TextUIDSL } from '../../domain/dsl-types';
import { loadDslWithIncludesFromPath } from '../../dsl/load-dsl-with-includes';
import { HtmlExporter } from '../../exporters/html-exporter';
import {
  DEFAULT_HEIGHT,
  DEFAULT_SCALE,
  DEFAULT_WAIT_MS,
  DEFAULT_WIDTH,
  type PreviewCaptureOptions
} from './shared';
import { resolveBrowserPath } from './browser-resolution';
import { resolveThemePathForCapture } from './theme-resolution';

export type CapturePreparationResult = {
  outputPath: string;
  width: number;
  height: number;
  scale: number;
  waitMs: number;
  browserPath: string;
  tempDir: string;
  targetUrl: string;
  themePath?: string;
};

export function parseDslFile(sourcePath: string): TextUIDSL {
  const { dsl } = loadDslWithIncludesFromPath(sourcePath);
  return dsl as TextUIDSL;
}

function resolveDslForCapture(dsl: TextUIDSL, dslFilePath?: string): TextUIDSL {
  if (!dslFilePath) {
    return dsl;
  }
  const { dsl: resolvedDsl } = loadDslWithIncludesFromPath(dslFilePath);
  return resolvedDsl as TextUIDSL;
}

export async function prepareCaptureArtifacts(
  dsl: TextUIDSL,
  options: PreviewCaptureOptions
): Promise<CapturePreparationResult> {
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

  const themePath = resolveThemePathForCapture(
    options.themePath,
    options.dslFilePath,
    options.useWebViewTheme
  );

  const resolvedDsl = resolveDslForCapture(dsl, options.dslFilePath);
  const html = await new HtmlExporter().export(resolvedDsl, {
    format: 'html',
    themePath,
    // Preview capture preparation defaults to the Primary path unless a caller overrides it.
    useReactRender: options.useReactRender ?? true,
    extensionPath: options.extensionPath
  });
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-preview-capture-'));
  const htmlPath = path.join(tempDir, 'preview.html');
  fs.writeFileSync(htmlPath, html, 'utf8');
  const targetUrl = pathToFileURL(htmlPath).toString();

  return {
    outputPath,
    width,
    height,
    scale,
    waitMs,
    browserPath,
    tempDir,
    targetUrl,
    themePath
  };
}
