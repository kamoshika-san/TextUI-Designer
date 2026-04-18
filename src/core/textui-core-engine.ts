import type { ValidationIssue } from '../cli/types';
import type { NavigationFlowDSL, TextUIDSL } from '../domain/dsl-types';
import type { HeuristicPolicy } from './diff/heuristic-policy';
import { normalize } from './diff-normalization/normalize';
import { normalizeFlowDiff } from './diff-normalization/flow-normalizer';
import { toDiagnosticEntry } from './diff-normalization/degrade-policy';
import type { NormalizationDiagnosticEntry } from './diff-normalization/degrade-policy';
import { getTextUiComponentCatalog, type TextUIComponentCatalogEntry } from './component-catalog';
import { TextUiCoreComponentBuilder, getComponentSpecHandlerFlagsForTesting, getComponentSpecTypesForTesting } from './textui-core-component-builder';
import {
  type SemanticDiffProvider,
  V1SemanticDiffProvider,
  type DiffCompareDocument,
  type DiffCompareResult,
  type FlowDiffCompareDocument,
  type FlowDiffNormalizationResult
} from './textui-core-diff';
import { buildGenerateUiDsl, buildExplainErrorResponseDomain, normalizeDslDomain } from './textui-core-engine-domain';
import {
  exportUiDslToCode,
  getSupportedProvidersIo,
  previewSchemaValueIo,
  validateNormalizedDslIo
} from './textui-core-engine-io';
import { stringifyUiYaml, toCoreValidationResponse } from './textui-core-engine-format';
import { buildFlowSemanticDiff, type FlowSemanticDiffResult } from '../services/semantic-diff';

export interface ComponentBlueprint {
  type: string;
  props?: Record<string, unknown>;
  components?: ComponentBlueprint[];
  fields?: ComponentBlueprint[];
  actions?: ComponentBlueprint[];
  items?: TreeViewBlueprintItem[] | Array<Record<string, unknown> & { components?: ComponentBlueprint[] }>;
}

export interface TreeViewBlueprintItem extends Record<string, unknown> {
  components?: ComponentBlueprint[];
  children?: TreeViewBlueprintItem[];
}

export interface GenerateUiRequest {
  title: string;
  pageId?: string;
  layout?: string;
  components?: ComponentBlueprint[];
  format?: string;
  providerModulePath?: string;
  themePath?: string;
}

export interface CoreDiagnostic extends ValidationIssue {
  severity: 'error' | 'warning';
  hint: string;
}

export interface ValidateUiRequest {
  dsl: unknown;
  sourcePath?: string;
  skipTokenValidation?: boolean;
}

export interface ValidateUiResponse {
  valid: boolean;
  diagnostics: CoreDiagnostic[];
  normalizedDsl?: TextUIDSL;
  normalizedYaml?: string;
}

export interface ValidateFlowRequest {
  dsl: unknown;
  sourcePath?: string;
}

export interface ValidateFlowResponse {
  valid: boolean;
  diagnostics: CoreDiagnostic[];
  normalizedDsl?: NavigationFlowDSL;
}

export interface ExplainErrorRequest {
  diagnostics: Array<Pick<CoreDiagnostic, 'message' | 'path' | 'level'>>;
}

export interface CompareUiRequest {
  previousDsl: unknown;
  nextDsl: unknown;
  previousSourcePath?: string;
  nextSourcePath?: string;
  skipTokenValidation?: boolean;
  heuristicPolicy?: HeuristicPolicy;
}

export interface CompareUiResponse {
  ok: boolean;
  diagnostics: CoreDiagnostic[];
  normalizationDiagnostics?: NormalizationDiagnosticEntry[];
  previous?: DiffCompareDocument;
  next?: DiffCompareDocument;
  result?: DiffCompareResult;
}

export interface CompareFlowRequest {
  previousDsl: unknown;
  nextDsl: unknown;
  previousSourcePath?: string;
  nextSourcePath?: string;
}

export interface CompareFlowResponse {
  ok: boolean;
  diagnostics: CoreDiagnostic[];
  previous?: FlowDiffCompareDocument;
  next?: FlowDiffCompareDocument;
  result?: FlowDiffNormalizationResult;
  semantic?: FlowSemanticDiffResult;
}

export interface PreviewSchemaRequest {
  schema?: 'main' | 'template' | 'theme' | 'navigation';
  jsonPointer?: string;
}

export interface GenerateUiResponse {
  dsl: TextUIDSL;
  yaml: string;
  validation: ValidateUiResponse;
  exportedCode?: string;
}

export { getComponentSpecTypesForTesting, getComponentSpecHandlerFlagsForTesting };

export class TextUICoreEngine {
  private readonly componentBuilder = new TextUiCoreComponentBuilder();
  private readonly diffProvider: SemanticDiffProvider;

  constructor(diffProvider?: SemanticDiffProvider) {
    this.diffProvider = diffProvider ?? new V1SemanticDiffProvider();
  }

  private annotateCompareDiagnostics(source: 'previous' | 'next', diagnostics: CoreDiagnostic[]): CoreDiagnostic[] {
    return diagnostics.map(diagnostic => ({
      ...diagnostic,
      message: `[${source}] ${diagnostic.message}`
    }));
  }

  async generateUi(request: GenerateUiRequest): Promise<GenerateUiResponse> {
    const dsl: TextUIDSL = buildGenerateUiDsl(request, this.componentBuilder);

    const validation = this.validateUi({ dsl, skipTokenValidation: true });
    const exportedCode = request.format
      ? await exportUiDslToCode(dsl, request.format, {
          providerModulePath: request.providerModulePath,
          themePath: request.themePath
        })
      : undefined;

    return { dsl, yaml: stringifyUiYaml(dsl), validation, exportedCode };
  }

  validateUi(request: ValidateUiRequest): ValidateUiResponse {
    try {
      const normalizedDsl = normalizeDslDomain(request.dsl, 'ui') as TextUIDSL;
      const result = validateNormalizedDslIo(normalizedDsl, {
        sourcePath: request.sourcePath,
        skipTokenValidation: request.skipTokenValidation ?? true,
        schemaKind: 'main'
      });

      return toCoreValidationResponse(result, normalizedDsl);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        diagnostics: [{
          level: 'error',
          severity: 'error',
          message: message || 'Failed to parse the UI DSL.',
          path: '/',
          hint: 'Check the YAML or JSON syntax and the page root.'
        }]
      };
    }
  }

  validateFlow(request: ValidateFlowRequest): ValidateFlowResponse {
    try {
      const normalizedDsl = normalizeDslDomain(request.dsl, 'navigation') as NavigationFlowDSL;
      const result = validateNormalizedDslIo(normalizedDsl, {
        sourcePath: request.sourcePath,
        schemaKind: 'navigation'
      });

      return {
        valid: result.valid,
        diagnostics: result.issues.map(issue => ({
          ...issue,
          severity: issue.level === 'error' ? 'error' : 'warning',
          hint: issue.code ? `Fix ${issue.code} in the navigation flow definition.` : 'Review the navigation flow definition.'
        })),
        normalizedDsl
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        diagnostics: [{
          level: 'error',
          severity: 'error',
          message: message || 'Failed to parse the navigation flow.',
          path: '/',
          hint: 'Check the YAML or JSON syntax and the flow root.'
        }]
      };
    }
  }

  explainError(request: ExplainErrorRequest): { summary: string; suggestions: Array<{ path: string; message: string; hint: string }> } {
    return buildExplainErrorResponseDomain(request);
  }

  compareUi(request: CompareUiRequest): CompareUiResponse {
    const previousValidation = this.validateUi({
      dsl: request.previousDsl,
      sourcePath: request.previousSourcePath,
      skipTokenValidation: request.skipTokenValidation ?? true
    });
    const nextValidation = this.validateUi({
      dsl: request.nextDsl,
      sourcePath: request.nextSourcePath,
      skipTokenValidation: request.skipTokenValidation ?? true
    });

    const diagnostics: CoreDiagnostic[] = [];
    if (!previousValidation.valid) {
      diagnostics.push(...this.annotateCompareDiagnostics('previous', previousValidation.diagnostics));
    }
    if (!nextValidation.valid) {
      diagnostics.push(...this.annotateCompareDiagnostics('next', nextValidation.diagnostics));
    }

    if (diagnostics.length > 0 || !previousValidation.normalizedDsl || !nextValidation.normalizedDsl) {
      return { ok: false, diagnostics };
    }

    const normalizationDiagnostics: NormalizationDiagnosticEntry[] = [];

    const prevNormResult = normalize(previousValidation.normalizedDsl);
    const prevDsl: TextUIDSL = prevNormResult.ok
      ? prevNormResult.dsl
      : (() => {
          normalizationDiagnostics.push(toDiagnosticEntry(prevNormResult, 'previous'));
          return previousValidation.normalizedDsl!;
        })();

    const nextNormResult = normalize(nextValidation.normalizedDsl);
    const nextDsl: TextUIDSL = nextNormResult.ok
      ? nextNormResult.dsl
      : (() => {
          normalizationDiagnostics.push(toDiagnosticEntry(nextNormResult, 'next'));
          return nextValidation.normalizedDsl!;
        })();

    const previous = this.diffProvider.createStructureDiffDocument(prevDsl, {
      side: 'previous',
      sourcePath: request.previousSourcePath
    });
    const next = this.diffProvider.createStructureDiffDocument(nextDsl, {
      side: 'next',
      sourcePath: request.nextSourcePath
    });

    return {
      ok: true,
      diagnostics: [],
      ...(normalizationDiagnostics.length > 0 ? { normalizationDiagnostics } : {}),
      previous,
      next,
      result: this.diffProvider.compareStructureDiff(previous, next, request.heuristicPolicy)
    };
  }

  compareFlow(request: CompareFlowRequest): CompareFlowResponse {
    const previousValidation = this.validateFlow({
      dsl: request.previousDsl,
      sourcePath: request.previousSourcePath
    });
    const nextValidation = this.validateFlow({
      dsl: request.nextDsl,
      sourcePath: request.nextSourcePath
    });

    const diagnostics: CoreDiagnostic[] = [];
    if (!previousValidation.valid) {
      diagnostics.push(...this.annotateCompareDiagnostics('previous', previousValidation.diagnostics));
    }
    if (!nextValidation.valid) {
      diagnostics.push(...this.annotateCompareDiagnostics('next', nextValidation.diagnostics));
    }

    if (diagnostics.length > 0 || !previousValidation.normalizedDsl || !nextValidation.normalizedDsl) {
      return { ok: false, diagnostics };
    }

    const result = normalizeFlowDiff({
      previousDsl: previousValidation.normalizedDsl,
      nextDsl: nextValidation.normalizedDsl,
      previousSourcePath: request.previousSourcePath,
      nextSourcePath: request.nextSourcePath
    });

    return {
      ok: true,
      diagnostics: [],
      previous: this.diffProvider.createFlowDiffDocument(previousValidation.normalizedDsl, {
        side: 'previous',
        sourcePath: request.previousSourcePath
      }),
      next: this.diffProvider.createFlowDiffDocument(nextValidation.normalizedDsl, {
        side: 'next',
        sourcePath: request.nextSourcePath
      }),
      result,
      semantic: buildFlowSemanticDiff({
        previousDsl: previousValidation.normalizedDsl,
        nextDsl: nextValidation.normalizedDsl,
        previousSourcePath: request.previousSourcePath,
        nextSourcePath: request.nextSourcePath
      })
    };
  }

  previewSchema(request: PreviewSchemaRequest = {}): { schema: 'main' | 'template' | 'theme' | 'navigation'; jsonPointer?: string; value: unknown } {
    const schema = request.schema ?? 'main';
    return {
      schema,
      jsonPointer: request.jsonPointer,
      value: previewSchemaValueIo(schema, request.jsonPointer)
    };
  }

  async listComponents(): Promise<{ components: TextUIComponentCatalogEntry[]; supportedProviders: string[] }> {
    return {
      components: getTextUiComponentCatalog(),
      supportedProviders: await getSupportedProvidersIo()
    };
  }

  async getSupportedProviders(): Promise<string[]> {
    return getSupportedProvidersIo();
  }
}
