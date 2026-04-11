import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import type { NavigationFlowDSL, NavigationTerminalKind } from '../../domain/dsl-types';
import { isNavigationFlowDSL } from '../../domain/dsl-types';
import { TextUICoreEngine } from '../../core/textui-core-engine';
import { getArg, hasFlag, printJson } from '../command-support';
import { ensureDirectoryForFile, loadDslFromFile, resolveDslFile } from '../io';
import type { ExitCode } from '../types';
import { getProviderExtension } from '../exporter-runner';
import {
  buildNavigationGraph,
  collectReachableScreenIds,
  collectReverseReachableScreenIds,
  findShortestNavigationRoute,
  getTerminalScreenIds
} from '../../shared/navigation-graph';

function getFlowSubcommand(): string | undefined {
  return process.argv[3]?.toLowerCase();
}

function getFlowPositionalFileArg(): string | undefined {
  const args = process.argv.slice(4);
  return args.find(arg => !arg.startsWith('-'));
}

function requireFlowFileArg(): string {
  return getArg('--file') ?? getFlowPositionalFileArg() ?? '';
}

function requireArg(flag: string): string {
  const value = getArg(flag);
  if (!value) {
    throw new Error(`flow compare requires ${flag}`);
  }
  return value;
}

function loadNavigationFlowFromPath(fileArg: string): { dsl: NavigationFlowDSL; sourcePath: string } {
  const loaded = loadDslFromFile(resolveDslFile(fileArg));
  if (loaded.kind !== 'navigation-flow' || !isNavigationFlowDSL(loaded.dsl)) {
    throw new Error(`flow command requires a navigation flow file: ${loaded.sourcePath}`);
  }
  return {
    dsl: loaded.dsl,
    sourcePath: loaded.sourcePath
  };
}

function resolveRepoRoot(startPath: string): string {
  const stat = fs.statSync(startPath);
  const cwd = stat.isDirectory() ? startPath : path.dirname(startPath);
  return execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd,
    encoding: 'utf8'
  }).trim();
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
  return execFileSync('git', ['show', `${ref}:${relativeFilePath}`], {
    cwd: repoRoot,
    encoding: 'utf8'
  }).trimEnd();
}

function parseNavigationFlow(raw: string, label: string): NavigationFlowDSL {
  try {
    const parsed = YAML.parse(raw);
    if (!isNavigationFlowDSL(parsed)) {
      throw new Error('parsed document is not a navigation flow DSL');
    }
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`failed to parse ${label}: ${message}`);
  }
}

async function handleFlowValidateCommand(): Promise<ExitCode> {
  const engine = new TextUICoreEngine();
  const fileArg = requireFlowFileArg();
  if (!fileArg) {
    throw new Error('flow validate requires --file <path> or a positional file path');
  }
  const loaded = loadNavigationFlowFromPath(fileArg);
  const result = engine.validateFlow({
    dsl: loaded.dsl,
    sourcePath: loaded.sourcePath
  });

  if (hasFlag('--json')) {
    printJson({
      valid: result.valid,
      issues: result.diagnostics
    });
  } else if (result.valid) {
    process.stdout.write(`valid: ${loaded.sourcePath}\n`);
  } else {
    result.diagnostics.forEach(issue => {
      process.stderr.write(`${issue.path ?? '/'} ${issue.message}\n`);
    });
  }

  return result.valid ? 0 : 2;
}

async function handleFlowAnalyzeCommand(): Promise<ExitCode> {
  const fileArg = requireFlowFileArg();
  if (!fileArg) {
    throw new Error('flow analyze requires --file <path> or a positional file path');
  }

  const loaded = loadNavigationFlowFromPath(fileArg);
  const graph = buildNavigationGraph(loaded.dsl);
  const entryId = getArg('--entry') ?? loaded.dsl.flow.entry;
  const screenId = getArg('--screen') ?? loaded.dsl.flow.entry;

  const payload = {
    kind: 'flow-analysis-result/v1',
    filePath: loaded.sourcePath,
    flow: {
      id: loaded.dsl.flow.id,
      version: loaded.dsl.flow.version ?? '1',
      title: loaded.dsl.flow.title,
      entry: loaded.dsl.flow.entry,
      policy: loaded.dsl.flow.policy ?? {},
      screenCount: loaded.dsl.flow.screens.length,
      transitionCount: loaded.dsl.flow.transitions.length
    },
    terminals: getTerminalScreenIds(graph).map(id => ({
      id,
      terminal: graph.screenById.get(id)?.terminal ?? null
    })),
    query: {
      entryId,
      screenId,
      reachableFromEntry: [...collectReachableScreenIds(graph, entryId)],
      reverseReachableToScreen: [...collectReverseReachableScreenIds(graph, screenId)]
    }
  };

  if (hasFlag('--json')) {
    printJson(payload);
  } else {
    process.stdout.write(`Flow Analyze: ${loaded.sourcePath}\n`);
    process.stdout.write(`Entry: ${payload.flow.entry}\n`);
    process.stdout.write(`Reachable: ${payload.query.reachableFromEntry.join(', ')}\n`);
  }

  return 0;
}

async function handleFlowRouteCommand(): Promise<ExitCode> {
  const fileArg = requireFlowFileArg();
  if (!fileArg) {
    throw new Error('flow route requires --file <path> or a positional file path');
  }

  const loaded = loadNavigationFlowFromPath(fileArg);
  const graph = buildNavigationGraph(loaded.dsl);
  const entryId = getArg('--entry') ?? loaded.dsl.flow.entry;
  const toScreenId = getArg('--to-screen');
  const toTerminalKind = getArg('--to-terminal-kind') as NavigationTerminalKind | undefined;

  if (!toScreenId && !toTerminalKind) {
    throw new Error('flow route requires --to-screen <id> or --to-terminal-kind <kind>');
  }

  const route = findShortestNavigationRoute(graph, {
    entryId,
    toScreenId,
    toTerminalKind
  });

  const payload = {
    kind: 'flow-route-result/v1',
    filePath: loaded.sourcePath,
    entryId,
    toScreenId: toScreenId ?? null,
    toTerminalKind: toTerminalKind ?? null,
    found: route !== null,
    route
  };

  if (hasFlag('--json')) {
    printJson(payload);
  } else if (route) {
    process.stdout.write(`Route: ${route.screenIds.join(' -> ')}\n`);
  } else {
    process.stderr.write('route not found\n');
  }

  return route ? 0 : 2;
}

async function handleFlowCompareCommand(): Promise<ExitCode> {
  const engine = new TextUICoreEngine();
  const fileArg = requireFlowFileArg();
  if (!fileArg) {
    throw new Error('flow compare requires --file <path> or a positional file path');
  }
  const filePath = path.resolve(fileArg);
  const baseRef = requireArg('--base');
  const headRef = requireArg('--head');
  const repoRoot = resolveRepoRoot(filePath);
  const relativeFilePath = resolveRelativeFilePath(repoRoot, filePath);
  const previousDsl = parseNavigationFlow(readRevisionFile(repoRoot, baseRef, relativeFilePath), `${baseRef}:${relativeFilePath}`);
  const nextDsl = parseNavigationFlow(readRevisionFile(repoRoot, headRef, relativeFilePath), `${headRef}:${relativeFilePath}`);
  const result = engine.compareFlow({
    previousDsl,
    nextDsl,
    previousSourcePath: filePath,
    nextSourcePath: filePath
  });

  if (!result.ok) {
    if (hasFlag('--json')) {
      printJson(result);
    } else {
      result.diagnostics.forEach(issue => {
        process.stderr.write(`${issue.path ?? '/'} ${issue.message}\n`);
      });
    }
    return 2;
  }

  const payload = {
    kind: 'flow-semantic-diff-result/v1',
    metadata: {
      repoRoot,
      filePath,
      relativeFilePath,
      baseRef,
      headRef,
      comparedAt: new Date().toISOString()
    },
    result
  };

  if (hasFlag('--json') || (getArg('--mode') ?? '').toLowerCase() === 'machine-readable') {
    printJson(payload);
  } else {
    process.stdout.write(`Flow Compare: ${relativeFilePath}\n`);
    process.stdout.write(`Compare: ${baseRef} -> ${headRef}\n`);
    process.stdout.write(
      `Summary: +${result.semantic?.summary.added ?? 0} / -${result.semantic?.summary.removed ?? 0} / ~${result.semantic?.summary.changed ?? 0}\n`
    );
  }

  return 0;
}

function resolveFlowExportFormat(rawFormat: string): string {
  const normalized = rawFormat.toLowerCase();
  switch (normalized) {
    case 'react-router':
    case 'react-flow':
      return 'react-flow';
    case 'vue-router':
    case 'vue-flow':
      return 'vue-flow';
    case 'sveltekit':
    case 'svelte-flow':
      return 'svelte-flow';
    case 'html':
    case 'html-flow':
      return 'html-flow';
    default:
      return normalized;
  }
}

async function handleFlowExportCommand(): Promise<ExitCode> {
  const fileArg = requireFlowFileArg();
  if (!fileArg) {
    throw new Error('flow export requires --file <path> or a positional file path');
  }
  const loaded = loadNavigationFlowFromPath(fileArg);
  const format = resolveFlowExportFormat(getArg('--format') ?? getArg('--provider') ?? 'react-flow');
  const content = await exportFlowDsl(loaded.dsl, format);
  const providerExtension = await getProviderExtension(format);
  const output = path.resolve(getArg('--output') ?? `generated/textui-flow${providerExtension}`);
  ensureDirectoryForFile(output);
  fs.writeFileSync(output, content, 'utf8');

  if (hasFlag('--json')) {
    printJson({
      output,
      provider: format,
      bytes: Buffer.byteLength(content, 'utf8')
    });
  } else {
    process.stdout.write(`Exported: ${output}\n`);
  }

  return 0;
}

async function exportFlowDsl(dsl: NavigationFlowDSL, format: string): Promise<string> {
  switch (format) {
    case 'react-flow': {
      const { FlowReactExporter } = await import('../../exporters/flow-react-exporter');
      return new FlowReactExporter().export(dsl, { format });
    }
    case 'vue-flow': {
      const { FlowVueExporter } = await import('../../exporters/flow-vue-exporter');
      return new FlowVueExporter().export(dsl, { format });
    }
    case 'svelte-flow': {
      const { FlowSvelteExporter } = await import('../../exporters/flow-svelte-exporter');
      return new FlowSvelteExporter().export(dsl, { format });
    }
    case 'html-flow': {
      const { FlowHtmlExporter } = await import('../../exporters/flow-html-exporter');
      return new FlowHtmlExporter().export(dsl, { format });
    }
    default:
      throw new Error(`unsupported flow export format: ${format}`);
  }
}

export async function handleFlowCommand(): Promise<ExitCode> {
  const subcommand = getFlowSubcommand();
  switch (subcommand) {
    case 'validate':
      return handleFlowValidateCommand();
    case 'compare':
      return handleFlowCompareCommand();
    case 'analyze':
      return handleFlowAnalyzeCommand();
    case 'route':
      return handleFlowRouteCommand();
    case 'export':
      return handleFlowExportCommand();
    default:
      throw new Error('flow requires one of: validate | compare | analyze | route | export');
  }
}
