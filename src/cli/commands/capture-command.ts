import * as fs from 'fs';
import * as path from 'path';
import { withExplicitFallbackHtmlExport } from '../../exporters/html-export-lane-options';
import { capturePreviewImageFromDsl } from '../../utils/preview-capture';
import { loadDslFromFile, resolveDslFile, ensureDirectoryForFile } from '../io';
import { validateDsl } from '../validator';
import type { ExitCode } from '../types';
import {
  getArg,
  hasFlag,
  parseOptionalNonNegativeInt,
  parseOptionalPositiveInt,
  parseOptionalPositiveNumber,
  parseThemePath,
  printJson
} from '../command-support';
import type { FileTargetArgs } from './types';

function stripDslExtension(filePath: string): string {
  return filePath.replace(/\.tui\.ya?ml$/i, '');
}

export async function handleCaptureCommand(args: FileTargetArgs): Promise<ExitCode> {
  if (args.dirArg) {
    process.stderr.write('capture does not support --dir. use --file <path>\n');
    return 1;
  }

  const filePath = resolveDslFile(args.fileArg);
  const loaded = loadDslFromFile(filePath);
  const validation = validateDsl(loaded.dsl, {
    sourcePath: loaded.sourcePath,
    skipTokenValidation: true,
    schemaKind: loaded.kind === 'navigation-flow' ? 'navigation' : 'main'
  });
  if (!validation.valid) {
    if (hasFlag('--json')) {
      printJson({ valid: false, issues: validation.issues });
    } else {
      validation.issues.forEach(issue => {
        process.stderr.write(`✖ ${issue.path ?? '/'} ${issue.message}\n`);
      });
    }
    return 2;
  }

  const output = path.resolve(getArg('--output') ?? `generated/${stripDslExtension(path.basename(filePath))}.preview.png`);
  const themePath = parseThemePath();
  const useWebViewTheme = hasFlag('--use-webview-theme');
  const extensionPathRaw = getArg('--extension-path');
  const extensionPath = extensionPathRaw ? path.resolve(extensionPathRaw) : undefined;
  const width = parseOptionalPositiveInt('--width');
  const height = parseOptionalPositiveInt('--height');
  const scale = parseOptionalPositiveNumber('--scale');
  const waitMs = parseOptionalNonNegativeInt('--wait-ms');
  const browserPath = getArg('--browser');
  const allowNoSandbox = hasFlag('--allow-no-sandbox');
  ensureDirectoryForFile(output);

  const result = await capturePreviewImageFromDsl(loaded.dsl, withExplicitFallbackHtmlExport({
    outputPath: output,
    themePath,
    useWebViewTheme,
    dslFilePath: loaded.sourcePath,
    extensionPath,
    width,
    height,
    scale,
    waitMs,
    browserPath,
    allowNoSandbox
  }));
  const bytes = fs.statSync(output).size;

  if (hasFlag('--json')) {
    printJson({
      captured: true,
      file: loaded.sourcePath,
      output,
      bytes,
      width: result.width,
      height: result.height,
      browserPath: result.browserPath,
      themePath
    });
  } else {
    process.stdout.write(`Captured preview image: ${output}\n`);
    process.stdout.write(`  file: ${loaded.sourcePath}\n`);
    process.stdout.write(`  size: ${result.width}x${result.height}\n`);
    process.stdout.write(`  bytes: ${bytes}\n`);
    process.stdout.write(`  browser: ${result.browserPath}\n`);
    if (themePath) {
      process.stdout.write(`  theme: ${themePath}\n`);
    }
  }
  return 0;
}
