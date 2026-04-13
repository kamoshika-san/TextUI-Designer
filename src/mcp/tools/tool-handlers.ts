import * as YAML from 'yaml';
import type { ComponentBlueprint, TextUICoreEngine } from '../../core/textui-core-engine';
import { generateFlowDsl, type GenerateFlowScreenInput, type GenerateFlowTransitionInput } from './generate-flow-dsl';
import { scaffoldApp, type ScaffoldScreenInput, type ScaffoldTransitionInput } from './scaffold-app';

function isComponentBlueprintArray(value: unknown): value is ComponentBlueprint[] {
  return Array.isArray(value) && value.every(
    item => item !== null && typeof item === 'object' && typeof (item as Record<string, unknown>).type === 'string'
  );
}

type GetObjectValue = (obj: Record<string, unknown>, key: string) => string | undefined;
type GetObjectUnknown = (obj: Record<string, unknown>, key: string) => unknown;
type GetObjectBoolean = (obj: Record<string, unknown>, key: string) => boolean | undefined;
type GetObjectArray = (obj: Record<string, unknown>, key: string) => unknown[] | undefined;

export type ToolHandler = () => Promise<unknown>;
export type ToolHandlers = Record<string, ToolHandler>;

export type ToolHandlerContext = {
  engine: TextUICoreEngine;
  args: Record<string, unknown>;
  getObjectValue: GetObjectValue;
  getObjectUnknown: GetObjectUnknown;
  getObjectBoolean: GetObjectBoolean;
  getObjectArray: GetObjectArray;
  runCli: (args: Record<string, unknown>) => Promise<unknown>;
  capturePreview: (args: Record<string, unknown>) => Promise<unknown>;
};

export function createToolHandlers(context: ToolHandlerContext): ToolHandlers {
  const {
    engine,
    args,
    getObjectValue,
    getObjectUnknown,
    getObjectBoolean,
    getObjectArray,
    runCli,
    capturePreview
  } = context;

  return {
    generate_ui: async () => engine.generateUi({
      title: getObjectValue(args, 'title') ?? '',
      pageId: getObjectValue(args, 'pageId'),
      layout: getObjectValue(args, 'layout'),
      components: (() => { const raw = getObjectArray(args, 'components'); return isComponentBlueprintArray(raw) ? raw : undefined; })(),
      format: getObjectValue(args, 'format'),
      providerModulePath: getObjectValue(args, 'providerModulePath'),
      themePath: getObjectValue(args, 'themePath')
    }),
    validate_ui: async () => {
      const rawDsl = getObjectUnknown(args, 'dsl');
      const filePath = getObjectValue(args, 'filePath');
      if (rawDsl !== undefined && filePath !== undefined) {
        throw new Error('validate_ui: specify either dsl or filePath, not both');
      }
      let dsl: string | Record<string, unknown>;
      if (filePath !== undefined) {
        const fs = await import('fs');
        const path = await import('path');
        const resolved = path.resolve(filePath);
        dsl = fs.readFileSync(resolved, 'utf8');
      } else {
        if (rawDsl === undefined) { throw new Error('validate_ui requires dsl or filePath'); }
        dsl = rawDsl as string | Record<string, unknown>;
      }
      return engine.validateUi({
        dsl,
        sourcePath: getObjectValue(args, 'sourcePath') ?? filePath,
        skipTokenValidation: getObjectBoolean(args, 'skipTokenValidation')
      });
    },
    validate_flow: async () => {
      const filePath = getObjectValue(args, 'filePath');
      if (!filePath) {
        throw new Error('validate_flow requires filePath');
      }
      return runCli({
        args: ['flow', 'validate', '--file', filePath, '--json'],
        parseJson: true
      });
    },
    compare_flow: async () => {
      const filePath = getObjectValue(args, 'filePath');
      const baseRef = getObjectValue(args, 'baseRef');
      const headRef = getObjectValue(args, 'headRef');
      if (!filePath || !baseRef || !headRef) {
        throw new Error('compare_flow requires filePath, baseRef, and headRef');
      }
      return runCli({
        args: ['flow', 'compare', '--base', baseRef, '--head', headRef, '--file', filePath, '--json'],
        parseJson: true
      });
    },
    analyze_flow: async () => {
      const filePath = getObjectValue(args, 'filePath');
      if (!filePath) {
        throw new Error('analyze_flow requires filePath');
      }
      return runCli({
        args: [
          'flow',
          'analyze',
          '--file', filePath,
          ...appendOptionalPair('--entry', getObjectValue(args, 'entryId')),
          ...appendOptionalPair('--screen', getObjectValue(args, 'screenId')),
          '--json'
        ],
        parseJson: true
      });
    },
    route_flow: async () => {
      const filePath = getObjectValue(args, 'filePath');
      if (!filePath) {
        throw new Error('route_flow requires filePath');
      }
      const toScreenId = getObjectValue(args, 'toScreenId');
      const toTerminalKind = getObjectValue(args, 'toTerminalKind');
      if (!toScreenId && !toTerminalKind) {
        throw new Error('route_flow requires toScreenId or toTerminalKind');
      }
      return runCli({
        args: [
          'flow',
          'route',
          '--file', filePath,
          ...appendOptionalPair('--entry', getObjectValue(args, 'entryId')),
          ...appendOptionalPair('--to-screen', toScreenId),
          ...appendOptionalPair('--to-terminal-kind', toTerminalKind),
          '--json'
        ],
        parseJson: true
      });
    },
    export_flow: async () => {
      const filePath = getObjectValue(args, 'filePath');
      if (!filePath) {
        throw new Error('export_flow requires filePath');
      }
      const format = getObjectValue(args, 'format');
      const outputPath = getObjectValue(args, 'outputPath');
      return runCli({
        args: [
          'flow',
          'export',
          '--file', filePath,
          ...appendOptionalPair('--format', format),
          ...appendOptionalPair('--output', outputPath),
          '--json'
        ],
        parseJson: true
      });
    },
    explain_error: async () => {
      const diagnostics = getObjectUnknown(args, 'diagnostics');
      if (!Array.isArray(diagnostics)) {
        throw new Error('explain_error requires diagnostics');
      }
      return engine.explainError({
        diagnostics: diagnostics
          .filter(item => item && typeof item === 'object')
          .map(item => {
            const value = item as Record<string, unknown>;
            return {
              message: typeof value.message === 'string' ? value.message : 'unknown error',
              path: typeof value.path === 'string' ? value.path : '/',
              level: value.level === 'warning' ? 'warning' : 'error'
            };
          })
      });
    },
    preview_schema: async () => engine.previewSchema({
      schema: getObjectValue(args, 'schema') as 'main' | 'template' | 'theme' | 'navigation' | undefined,
      jsonPointer: getObjectValue(args, 'jsonPointer')
    }),
    list_components: async () => engine.listComponents(),
    list_providers: async () => runCli({
      args: [
        'providers',
        '--json',
        ...appendOptionalPair('--provider-module', getObjectValue(args, 'providerModulePath'))
      ],
      parseJson: true
    }),
    inspect_state: async () => runCli({
      args: [
        'state',
        'show',
        '--json',
        ...appendOptionalPair('--state', getObjectValue(args, 'statePath'))
      ],
      parseJson: true
    }),
    run_cli: async () => runCli(args),
    capture_preview: async () => capturePreview(args),
    suggest_fix: async () => {
      const finding = getObjectUnknown(args, 'finding');
      if (!finding || typeof finding !== 'object') {
        throw new Error('suggest_fix requires finding object');
      }
      const f = finding as Record<string, unknown>;
      const fixHint = typeof f['fixHint'] === 'string' ? f['fixHint'] : null;
      const suggestion = fixHint
        ? `At \`${f['entityPath']}\`: ${fixHint}`
        : 'No fix hint available for this rule.';
      return {
        ruleId:     f['ruleId'] ?? '',
        entityPath: f['entityPath'] ?? '',
        severity:   f['severity'] ?? 'info',
        fixHint:    fixHint ?? null,
        suggestion,
      };
    },
    diff_ui: async () => {
      const filePath = getObjectValue(args, 'filePath');
      const baseRef  = getObjectValue(args, 'baseRef');
      const headRef  = getObjectValue(args, 'headRef');
      if (!filePath || !baseRef || !headRef) {
        throw new Error('diff_ui requires filePath, baseRef, and headRef');
      }
      return runCli({
        args: ['review', '--base', baseRef, '--head', headRef, '--file', filePath, '--format', 'json'],
        parseJson: true
      });
    },
    explain_change: async () => {
      const change = getObjectUnknown(args, 'change');
      if (!change || typeof change !== 'object') {
        throw new Error('explain_change requires change object');
      }
      const c = change as Record<string, unknown>;
      const humanReadable = c['humanReadable'] as Record<string, unknown> | undefined;
      return {
        changeId:    c['changeId'] ?? '',
        type:        c['type'] ?? '',
        componentId: c['componentId'] ?? '',
        layer:       c['layer'] ?? '',
        impact:      c['impact'] ?? 'low',
        explanation: {
          title:       humanReadable?.['title'] ?? `${c['type']} on ${c['componentId']}`,
          description: humanReadable?.['description'] ?? '',
          impact:      c['impact'] ?? 'low',
        }
      };
    },
    generate_flow: async () => {
      const title = getObjectValue(args, 'title');
      if (!title) { throw new Error('generate_flow requires title'); }
      const rawScreens = getObjectArray(args, 'screens');
      if (!rawScreens || rawScreens.length === 0) { throw new Error('generate_flow requires screens'); }
      const screens: GenerateFlowScreenInput[] = rawScreens.map(s => {
        const item = s as Record<string, unknown>;
        if (typeof item['id'] !== 'string') { throw new Error('each screen must have an id'); }
        return { id: item['id'], file: typeof item['file'] === 'string' ? item['file'] : undefined };
      });
      const rawTransitions = getObjectArray(args, 'transitions');
      const transitions: GenerateFlowTransitionInput[] = rawTransitions
        ? rawTransitions.map(t => {
            const item = t as Record<string, unknown>;
            return {
              from: String(item['from'] ?? ''),
              trigger: String(item['trigger'] ?? ''),
              to: String(item['to'] ?? '')
            };
          })
        : [];
      const generated = generateFlowDsl({
        title,
        flowId: getObjectValue(args, 'flowId'),
        entry: getObjectValue(args, 'entry'),
        screens,
        transitions
      });
      // validate_flow integration (E-GF-S3)
      try {
        const parsed = YAML.parse(generated.yaml);
        const validation = engine.validateFlow({ dsl: parsed });
        return {
          yaml: generated.yaml,
          flowId: generated.flowId,
          entry: generated.entry,
          valid: validation.valid,
          diagnostics: validation.diagnostics
        };
      } catch (parseErr) {
        const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        return {
          yaml: generated.yaml,
          flowId: generated.flowId,
          entry: generated.entry,
          valid: false,
          diagnostics: [{ level: 'error', severity: 'error', message: `YAML parse error: ${msg}`, path: '/' }]
        };
      }
    },
    scaffold_app: async () => {
      const title = getObjectValue(args, 'title');
      if (!title) { throw new Error('scaffold_app requires title'); }
      const rawScreens = getObjectArray(args, 'screens');
      if (!rawScreens || rawScreens.length === 0) { throw new Error('scaffold_app requires screens'); }
      const screens: ScaffoldScreenInput[] = rawScreens.map(s => {
        const item = s as Record<string, unknown>;
        if (typeof item['id'] !== 'string' || typeof item['title'] !== 'string') {
          throw new Error('each screen must have id and title');
        }
        return { id: item['id'], title: item['title'] };
      });
      const rawTransitions = getObjectArray(args, 'transitions');
      const transitions: ScaffoldTransitionInput[] = rawTransitions
        ? rawTransitions.map(t => {
            const item = t as Record<string, unknown>;
            return {
              from: String(item['from'] ?? ''),
              trigger: String(item['trigger'] ?? ''),
              to: String(item['to'] ?? '')
            };
          })
        : [];
      return scaffoldApp({
        title,
        outputDir: getObjectValue(args, 'outputDir'),
        screens,
        transitions
      }, engine);
    }
  };
}

function appendOptionalPair(flag: string, value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return [flag, value];
}
