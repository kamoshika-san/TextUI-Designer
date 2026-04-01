import type { ValidationIssue } from '../cli/types';
import type { TextUIDSL } from '../domain/dsl-types';
import type { HeuristicPolicy } from './diff/heuristic-policy';
import { normalize } from './diff-normalization/normalize';
import { toDiagnosticEntry } from './diff-normalization/degrade-policy';
import type { NormalizationDiagnosticEntry } from './diff-normalization/degrade-policy';
import { getTextUiComponentCatalog, type TextUIComponentCatalogEntry } from './component-catalog';
import { TextUiCoreComponentBuilder, getComponentSpecHandlerFlagsForTesting, getComponentSpecTypesForTesting } from './textui-core-component-builder';
import {
  createDiffResultSkeleton,
  createNormalizedDiffDocument,
  type DiffCompareDocument,
  type DiffCompareResult
} from './textui-core-diff';
import { buildGenerateUiDsl, buildExplainErrorResponseDomain, normalizeDslDomain } from './textui-core-engine-domain';
import {
  exportUiDslToCode,
  getSupportedProvidersIo,
  previewSchemaValueIo,
  validateNormalizedDslIo
} from './textui-core-engine-io';
import { stringifyUiYaml, toCoreValidationResponse } from './textui-core-engine-format';

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
  /** Normalization warnings/errors from the normalize() step. Absent when both sides normalized cleanly. */
  normalizationDiagnostics?: NormalizationDiagnosticEntry[];
  previous?: DiffCompareDocument;
  next?: DiffCompareDocument;
  result?: DiffCompareResult;
}

export interface PreviewSchemaRequest {
  schema?: 'main' | 'template' | 'theme';
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
      const normalizedDsl = normalizeDslDomain(request.dsl);
      const result = validateNormalizedDslIo(normalizedDsl, {
        sourcePath: request.sourcePath,
        skipTokenValidation: request.skipTokenValidation ?? true
      });

      return toCoreValidationResponse(result, normalizedDsl);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        diagnostics: [{
          level: 'error',
          severity: 'error',
          message: message || 'DSLの解析に失敗しました',
          path: '/',
          hint: 'YAML/JSON形式とpage定義を確認してください。'
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

    // compareStage extension point: currently 'c1-skeleton'; future 'c2-normalized' migration here
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

    const previous = createNormalizedDiffDocument(prevDsl, {
      side: 'previous',
      sourcePath: request.previousSourcePath
    });
    const next = createNormalizedDiffDocument(nextDsl, {
      side: 'next',
      sourcePath: request.nextSourcePath
    });

    return {
      ok: true,
      diagnostics: [],
      ...(normalizationDiagnostics.length > 0 ? { normalizationDiagnostics } : {}),
      previous,
      next,
      result: createDiffResultSkeleton(previous, next, request.heuristicPolicy)
    };
  }

  previewSchema(request: PreviewSchemaRequest = {}): { schema: 'main' | 'template' | 'theme'; jsonPointer?: string; value: unknown } {
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
    // 互換性のため public method は残しつつ、実装は I/O 層へ委譲する
    return getSupportedProvidersIo();
  }
}
