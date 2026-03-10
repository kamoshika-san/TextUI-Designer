import * as fs from 'fs';
import * as path from 'path';

interface ResolveBatchOutputPathParams {
  filePath: string;
  rootDir: string;
  providerExtension: string;
  outputArg?: string;
}

interface ResolveBatchStatePathParams {
  filePath: string;
  rootDir: string;
  stateArg?: string;
}

function stripDslExtension(filePath: string): string {
  return filePath.replace(/\.tui\.ya?ml$/i, '');
}

function assertDirectoryTarget(targetPath: string, flagName: '--output' | '--state'): void {
  if (fs.existsSync(targetPath) && !fs.statSync(targetPath).isDirectory()) {
    throw new Error(`${flagName} must be a directory when used with --dir: ${targetPath}`);
  }
}

export function resolveBatchOutputPath(params: ResolveBatchOutputPathParams): string {
  const outputRoot = path.resolve(params.outputArg ?? 'generated');
  assertDirectoryTarget(outputRoot, '--output');
  const relativeDslPath = path.relative(params.rootDir, params.filePath);
  const outputBase = stripDslExtension(relativeDslPath);
  return path.join(outputRoot, `${outputBase}${params.providerExtension}`);
}

export function resolveBatchStatePath(params: ResolveBatchStatePathParams): string {
  const stateRoot = path.resolve(params.stateArg ?? '.textui/state');
  assertDirectoryTarget(stateRoot, '--state');
  const relativeDslPath = path.relative(params.rootDir, params.filePath);
  const stateBase = stripDslExtension(relativeDslPath);
  return path.join(stateRoot, `${stateBase}.state.json`);
}
