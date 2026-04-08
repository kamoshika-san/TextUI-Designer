import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import type { TextUIDSL } from '../../domain/dsl-types';
import type { SemanticDiff } from '../../types/semantic-diff';
import { buildSemanticDiffIR } from './extract-semantic-diff-ir';
import { buildSemanticDiff } from './semantic-diff-engine';

export type SemanticDiffOutputMode = 'human-readable' | 'machine-readable';

export interface SemanticDiffCompareRequest {
  baseRef: string;
  headRef: string;
  filePath: string;
  repoPath?: string;
}

export interface SemanticDiffCompareMetadata {
  repoRoot: string;
  filePath: string;
  relativeFilePath: string;
  baseRef: string;
  headRef: string;
  comparedAt: string;
}

export interface SemanticDiffCompareResult {
  kind: 'semantic-diff-result/v1';
  metadata: SemanticDiffCompareMetadata;
  diff: SemanticDiff;
}

function runGit(repoRoot: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8'
  }).trimEnd();
}

function resolveRepoRoot(startPath: string): string {
  const stat = fs.statSync(startPath);
  const cwd = stat.isDirectory() ? startPath : path.dirname(startPath);
  return runGit(cwd, ['rev-parse', '--show-toplevel']).trim();
}

function resolveRelativeFilePath(repoRoot: string, filePath: string): string {
  const absoluteFilePath = path.resolve(filePath);
  const relativeFilePath = path.relative(repoRoot, absoluteFilePath);

  if (relativeFilePath.startsWith('..') || path.isAbsolute(relativeFilePath)) {
    throw new Error(`file is outside git repository: ${absoluteFilePath}`);
  }

  return relativeFilePath.replace(/\\/g, '/');
}

function readRevisionFile(repoRoot: string, ref: string, relativeFilePath: string): string {
  try {
    return runGit(repoRoot, ['show', `${ref}:${relativeFilePath}`]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`could not read ${relativeFilePath} at ${ref}: ${message}`);
  }
}

function ensureSingleFileDsl(raw: string, label: string): void {
  if (raw.includes('$include:')) {
    throw new Error(`${label} uses $include and is unsupported in semantic diff MVP compare mode`);
  }
}

function parseDsl(raw: string, label: string): TextUIDSL {
  try {
    return YAML.parse(raw) as TextUIDSL;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`failed to parse ${label}: ${message}`);
  }
}

export function runSemanticDiffCompare(request: SemanticDiffCompareRequest): SemanticDiffCompareResult {
  const filePath = path.resolve(request.filePath);
  const repoRoot = resolveRepoRoot(request.repoPath ?? filePath);
  const relativeFilePath = resolveRelativeFilePath(repoRoot, filePath);
  const beforeRaw = readRevisionFile(repoRoot, request.baseRef, relativeFilePath);
  const afterRaw = readRevisionFile(repoRoot, request.headRef, relativeFilePath);

  ensureSingleFileDsl(beforeRaw, `${request.baseRef}:${relativeFilePath}`);
  ensureSingleFileDsl(afterRaw, `${request.headRef}:${relativeFilePath}`);

  const previousDsl = parseDsl(beforeRaw, `${request.baseRef}:${relativeFilePath}`);
  const nextDsl = parseDsl(afterRaw, `${request.headRef}:${relativeFilePath}`);

  const previousIr = buildSemanticDiffIR(previousDsl, {
    documentPath: `${request.baseRef}:${relativeFilePath}`
  });
  const nextIr = buildSemanticDiffIR(nextDsl, {
    documentPath: `${request.headRef}:${relativeFilePath}`
  });

  return {
    kind: 'semantic-diff-result/v1',
    metadata: {
      repoRoot,
      filePath,
      relativeFilePath,
      baseRef: request.baseRef,
      headRef: request.headRef,
      comparedAt: new Date().toISOString()
    },
    diff: buildSemanticDiff(previousIr, nextIr)
  };
}

function renderHumanReadableChange(change: SemanticDiff['changes'][number]): string {
  const title = change.humanReadable?.title ?? `${change.type} ${change.componentId}`;
  const description = change.humanReadable?.description ?? '';
  const impact = change.humanReadable?.impact ?? 'low';
  const ambiguity = change.ambiguityReason ? ` [${change.ambiguityReason}]` : '';
  const evidence = change.evidence?.navigation;
  let evidenceLine = '';

  if (evidence?.previous && evidence?.next) {
    evidenceLine = `\n  Evidence: ${evidence.previous.location} -> ${evidence.next.location}`;
  } else if (evidence?.primary) {
    evidenceLine = `\n  Evidence: ${evidence.primary.location}`;
  }

  return `- ${title} (${impact})${ambiguity}${description ? `\n  ${description}` : ''}${evidenceLine}`;
}

export function renderSemanticDiffHumanReadable(result: SemanticDiffCompareResult): string {
  const lines: string[] = [];
  lines.push(`Semantic Diff: ${result.metadata.relativeFilePath}`);
  lines.push(`Compare: ${result.metadata.baseRef} -> ${result.metadata.headRef}`);
  lines.push(
    `Summary: +${result.diff.summary.added} / -${result.diff.summary.removed} / ~${result.diff.summary.modified} / moved ${result.diff.summary.moved}`
  );

  result.diff.grouped.forEach(group => {
    if (group.changes.length === 0) {
      return;
    }

    lines.push('');
    lines.push(`${group.type.toUpperCase()}:`);
    group.changes.forEach(change => {
      lines.push(renderHumanReadableChange(change));
    });
  });

  return `${lines.join('\n')}\n`;
}
