import * as fs from 'fs';
import * as path from 'path';
import { ensureDirectoryForFile, loadDslFromFile, resolveDslFile } from '../io';
import { validateDsl } from '../validator';
import {
  getProviderExtension,
  getSupportedProviderNames,
  isSupportedProvider,
  type CliProvider
} from '../exporter-runner';
import { resolveDslTokens } from '../theme-token-resolver';
import type { ExitCode } from '../types';
import {
  emitTokenWarnings,
  getArg,
  hasFlag,
  parseThemePath,
  parseTokenErrorMode,
  printJson,
  renderWithDeterministicCheck
} from '../command-support';

export async function handleExportCommand(fileArg: string | undefined): Promise<ExitCode> {
  const providerModulePath = getArg('--provider-module');
  const provider = (getArg('--provider') ?? 'html') as CliProvider;
  const themePath = parseThemePath();

  const filePath = resolveDslFile(fileArg);
  const loaded = loadDslFromFile(filePath);
  if (!await isSupportedProvider(provider, { providerModulePath })) {
    process.stderr.write(`unsupported provider: ${provider}\n`);
    const supportedProviders = await getSupportedProviderNames({ providerModulePath });
    process.stderr.write(`supported providers: ${supportedProviders.join(', ')}\n`);
    return 1;
  }
  const deterministic = hasFlag('--deterministic');
  const tokenOnError = parseTokenErrorMode();
  const validation = validateDsl(loaded.dsl, {
    sourcePath: loaded.sourcePath,
    skipTokenValidation: tokenOnError !== 'error'
  });
  if (!validation.valid) {
    return 2;
  }

  const tokenResolution = resolveDslTokens({
    dsl: loaded.dsl,
    sourcePath: loaded.sourcePath,
    onError: tokenOnError
  });
  if (tokenOnError === 'warn' && tokenResolution.issues.length > 0) {
    emitTokenWarnings(tokenResolution.issues);
  }

  const content = await renderWithDeterministicCheck({
    dsl: tokenResolution.dsl,
    provider,
    providerModulePath,
    themePath,
    deterministic
  });
  const providerExtension = await getProviderExtension(provider, { providerModulePath });
  const output = path.resolve(getArg('--output') ?? `generated/textui${providerExtension}`);
  ensureDirectoryForFile(output);
  fs.writeFileSync(output, content, 'utf8');

  if (hasFlag('--json')) {
    printJson({
      output,
      provider,
      bytes: Buffer.byteLength(content, 'utf8'),
      deterministic,
      themePath,
      tokenOnError,
      tokenWarnings: tokenResolution.issues.length
    });
  } else {
    process.stdout.write(`Exported: ${output}\n`);
    if (tokenResolution.issues.length > 0) {
      process.stdout.write(`token-warnings: ${tokenResolution.issues.length}\n`);
    }
  }
  return 0;
}
