import type { ValidationIssue } from '../cli/types';
import type { TextUIDSL } from '../domain/dsl-types';
import { getTextUiComponentCatalog, type TextUIComponentCatalogEntry } from './component-catalog';
import { TextUiCoreComponentBuilder, getComponentSpecHandlerFlagsForTesting, getComponentSpecTypesForTesting } from './textui-core-component-builder';
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
