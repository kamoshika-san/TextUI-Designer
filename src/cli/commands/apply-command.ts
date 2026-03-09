import * as path from 'path';
import { buildPlan } from '../planner';
import { DEFAULT_STATE_PATH, loadState } from '../state-manager';
import { loadDslFromFile, resolveDslFile, resolveDslFiles } from '../io';
import { validateDsl } from '../validator';
import {
  getProviderExtension,
  getProviderVersion,
  getSupportedProviderNames,
  isSupportedProvider,
  type CliProvider
} from '../exporter-runner';
import type { ExitCode } from '../types';
import {
  applyAcrossFiles,
  applyForFile,
  getArg,
  getStateFingerprint,
  hasFlag,
  parseThemePath,
  parseTokenErrorMode,
  printJson
} from '../command-support';
import type { FileTargetArgs } from './types';

export async function handleApplyCommand(args: FileTargetArgs): Promise<ExitCode> {
  const statePath = path.resolve(getArg('--state') ?? DEFAULT_STATE_PATH);
  const state = loadState(statePath);
  const initialStateFingerprint = getStateFingerprint(state);

  const providerModulePath = getArg('--provider-module');
  const provider = (getArg('--provider') ?? 'html') as CliProvider;
  const themePath = parseThemePath();

  if (!await isSupportedProvider(provider, { providerModulePath })) {
    process.stderr.write(`unsupported provider: ${provider}\n`);
    const supportedProviders = await getSupportedProviderNames({ providerModulePath });
    process.stderr.write(`supported providers: ${supportedProviders.join(', ')}\n`);
    return 1;
  }
  const deterministic = hasFlag('--deterministic');
  const tokenOnError = parseTokenErrorMode();
  if (args.dirArg) {
    const filePaths = resolveDslFiles(args.fileArg, args.dirArg);
    return applyAcrossFiles({
      filePaths,
      rootDir: path.resolve(args.dirArg),
      provider,
      providerModulePath,
      themePath,
      deterministic,
      tokenOnError,
      autoApprove: hasFlag('--auto-approve'),
      outputArg: getArg('--output'),
      stateArg: getArg('--state'),
      json: hasFlag('--json')
    });
  }

  const filePath = resolveDslFile(args.fileArg);
  const loaded = loadDslFromFile(filePath);
  const validation = validateDsl(loaded.dsl, {
    sourcePath: loaded.sourcePath,
    skipTokenValidation: tokenOnError !== 'error'
  });
  if (!validation.valid) {
    return 2;
  }

  const previewPlan = buildPlan(loaded.dsl, state);
  if (!previewPlan.hasChanges) {
    process.stdout.write('No changes. apply skipped.\n');
    return 0;
  }

  if (!hasFlag('--auto-approve')) {
    process.stderr.write('apply requires --auto-approve in non-interactive mode\n');
    return 1;
  }

  const providerExtension = await getProviderExtension(provider, { providerModulePath });
  const outputPath = path.resolve(getArg('--output') ?? `generated/textui${providerExtension}`);
  const providerVersion = await getProviderVersion(provider, { providerModulePath });
  const execution = await applyForFile({
    loaded,
    statePath,
    outputPath,
    planState: state,
    expectedStateFingerprint: initialStateFingerprint,
    provider,
    providerVersion,
    providerModulePath,
    themePath,
    deterministic,
    tokenOnError
  });

  if (!execution.applied) {
    process.stdout.write('No changes. apply skipped.\n');
    return 0;
  }
  if (execution.conflict) {
    process.stderr.write('state conflict detected: state changed since plan calculation\n');
    return 4;
  }

  if (hasFlag('--json')) {
    printJson({
      applied: true,
      output: outputPath,
      state: statePath,
      changes: execution.changes,
      deterministic,
      themePath,
      tokenOnError,
      tokenWarnings: execution.tokenWarnings
    });
  } else {
    process.stdout.write(`Applied ${execution.changes} change(s). state: ${statePath}\n`);
    if (execution.tokenWarnings > 0) {
      process.stdout.write(`token-warnings: ${execution.tokenWarnings}\n`);
    }
  }
  return 0;
}
