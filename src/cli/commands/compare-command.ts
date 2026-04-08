import { atomicWriteJson } from '../io';
import type { ExitCode } from '../types';
import { getArg, hasFlag, printJson } from '../command-support';
import {
  renderSemanticDiffHumanReadable,
  runSemanticDiffCompare,
  type SemanticDiffOutputMode
} from '../../services/semantic-diff';

function parseMode(): SemanticDiffOutputMode {
  const rawMode = (getArg('--mode') ?? 'human-readable').toLowerCase();
  if (rawMode === 'human-readable' || rawMode === 'machine-readable') {
    return rawMode;
  }

  throw new Error(`invalid --mode value: ${rawMode}. expected: human-readable|machine-readable`);
}

function requireArg(flag: string): string {
  const value = getArg(flag);
  if (!value) {
    throw new Error(`compare requires ${flag}`);
  }
  return value;
}

export async function handleCompareCommand(): Promise<ExitCode> {
  const mode = parseMode();
  const baseRef = requireArg('--base');
  const headRef = requireArg('--head');
  const filePath = requireArg('--file');
  const outputPath = getArg('--output');
  const result = runSemanticDiffCompare({
    baseRef,
    headRef,
    filePath
  });

  if (mode === 'machine-readable' || hasFlag('--json')) {
    if (outputPath) {
      atomicWriteJson(outputPath, result);
      process.stdout.write(`Wrote semantic diff JSON: ${outputPath}\n`);
    } else {
      printJson(result);
    }
    return 0;
  }

  const rendered = renderSemanticDiffHumanReadable(result);
  if (outputPath) {
    atomicWriteJson(outputPath, { rendered });
    process.stdout.write(`Wrote semantic diff output: ${outputPath}\n`);
    return 0;
  }

  process.stdout.write(rendered);
  return 0;
}
