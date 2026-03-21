import * as fs from 'fs';
import * as path from 'path';
import type { TextUIDSL } from '../domain/dsl-types';
import {
  type PreviewCaptureOptions,
  type PreviewCaptureResult,
  type CaptureLog,
  PNG_MAGIC,
  parseBooleanEnv
} from './preview-capture/shared';
import { prepareCaptureArtifacts, parseDslFile } from './preview-capture/html-preparation';
import { runPuppeteerFullPageCapture, expandScrollableContainersForCapture } from './preview-capture/puppeteer-capture';
import { runCaptureViaCli, runBrowserCapture } from './preview-capture/cli-fallback';

export type { PreviewCaptureOptions, PreviewCaptureResult };

export async function capturePreviewImageFromDslFile(
  dslFilePath: string,
  options: PreviewCaptureOptions
): Promise<PreviewCaptureResult> {
  const sourcePath = path.resolve(dslFilePath);
  const dsl = parseDslFile(sourcePath);
  return capturePreviewImageFromDsl(dsl, { ...options, dslFilePath: sourcePath });
}

export async function capturePreviewImageFromDsl(
  dsl: TextUIDSL,
  options: PreviewCaptureOptions
): Promise<PreviewCaptureResult> {
  const allowNoSandbox = options.allowNoSandbox ?? parseBooleanEnv(process.env.TEXTUI_CAPTURE_ALLOW_NO_SANDBOX);
  const prep = await prepareCaptureArtifacts(dsl, options);

  try {
    options.log?.(
      `capture path: trying puppeteer full-page (url=${prep.targetUrl}, width=${prep.width}, height=${prep.height}, waitMs=${prep.waitMs})`
    );
    const puppeteerResult = await runPuppeteerFullPageCapture({
      browserPath: prep.browserPath,
      outputPath: prep.outputPath,
      width: prep.width,
      height: prep.height,
      scale: prep.scale,
      waitMs: prep.waitMs,
      allowNoSandbox,
      targetUrl: prep.targetUrl,
      log: options.log
    });

    if (puppeteerResult) {
      options.log?.('capture path: puppeteer full-page succeeded');
      return puppeteerResult;
    }

    if (options.extensionPath && options.dslFilePath) {
      options.log?.(
        `Puppeteer failed, trying CLI spawn (extensionPath=${options.extensionPath}, dslFilePath=${options.dslFilePath})`
      );
      const cliSuccess = await runCaptureViaCli({
        extensionPath: options.extensionPath,
        cliSpawnPath: options.cliSpawnPath,
        dslFilePath: options.dslFilePath,
        outputPath: prep.outputPath,
        themePath: prep.themePath,
        useWebViewTheme: options.useWebViewTheme,
        width: prep.width,
        height: prep.height,
        scale: prep.scale,
        waitMs: prep.waitMs,
        browserPath: prep.browserPath,
        allowNoSandbox,
        log: options.log
      });
      if (cliSuccess && fs.existsSync(prep.outputPath)) {
        const image = fs.readFileSync(prep.outputPath);
        if (image.length >= 8 && image.subarray(0, 4).equals(PNG_MAGIC)) {
          options.log?.('capture path: CLI spawn succeeded');
          return {
            outputPath: prep.outputPath,
            browserPath: prep.browserPath,
            width: prep.width,
            height: prep.height
          };
        }
        options.log?.('runCaptureViaCli: CLI exited 0 but output file missing or not valid PNG');
      } else {
        options.log?.('runCaptureViaCli: CLI failed or timed out');
      }
    }

    options.log?.('capture path: falling back to runBrowserCapture (viewport only)');
    const execution = await runBrowserCapture({
      browserPath: prep.browserPath,
      outputPath: prep.outputPath,
      width: prep.width,
      height: prep.height,
      scale: prep.scale,
      waitMs: prep.waitMs,
      allowNoSandbox,
      targetUrl: prep.targetUrl,
      log: options.log as CaptureLog | undefined
    });

    if (execution.code !== 0) {
      throw new Error(`capture failed (code=${execution.code}): ${execution.stderr || execution.stdout}`.trim());
    }
    if (!fs.existsSync(prep.outputPath)) {
      throw new Error('capture failed: output image was not created');
    }
    const image = fs.readFileSync(prep.outputPath);
    if (image.length < 8 || !image.subarray(0, 4).equals(PNG_MAGIC)) {
      throw new Error('capture failed: output file is not a PNG image');
    }

    return {
      outputPath: prep.outputPath,
      browserPath: prep.browserPath,
      width: prep.width,
      height: prep.height
    };
  } finally {
    fs.rmSync(prep.tempDir, { recursive: true, force: true });
  }
}

export { expandScrollableContainersForCapture };

