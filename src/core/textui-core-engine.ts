import * as YAML from 'yaml';
import { validateDsl } from '../cli/validator';
import { getSupportedProviderNames, runExport } from '../cli/exporter-runner';
import type { ValidationIssue } from '../cli/types';
import type { TextUIDSL } from '../renderer/types';
import { getTextUiComponentCatalog, type TextUIComponentCatalogEntry } from './component-catalog';
import { TextUiCoreComponentBuilder, getComponentSpecHandlerFlagsForTesting, getComponentSpecTypesForTesting } from './textui-core-component-builder';
import { mapDiagnostic, mapHint, parseDsl, previewSchemaValue, toPageId } from './textui-core-helpers';

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
    const dsl: TextUIDSL = {
      page: {
        id: request.pageId ?? toPageId(request.title),
        title: request.title,
        layout: request.layout ?? 'vertical',
        components: this.componentBuilder.buildComponents(request.components ?? [])
      }
    };

    const validation = this.validateUi({ dsl, skipTokenValidation: true });
    const exportedCode = request.format
      ? await runExport(dsl, request.format, {
          providerModulePath: request.providerModulePath,
          themePath: request.themePath
        })
      : undefined;

    return { dsl, yaml: YAML.stringify(dsl), validation, exportedCode };
  }

  validateUi(request: ValidateUiRequest): ValidateUiResponse {
    try {
      const normalizedDsl = parseDsl(request.dsl);
      const result = validateDsl(normalizedDsl, {
        sourcePath: request.sourcePath,
        skipTokenValidation: request.skipTokenValidation ?? true
      });

      return {
        valid: result.valid,
        diagnostics: result.issues.map(issue => mapDiagnostic(issue)),
        normalizedDsl,
        normalizedYaml: YAML.stringify(normalizedDsl)
      };
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
    const suggestions = request.diagnostics.map(issue => ({
      path: issue.path ?? '/',
      message: issue.message,
      hint: mapHint(issue.message)
    }));

    if (suggestions.length === 0) {
      return { summary: 'エラーはありません。', suggestions: [] };
    }

    const first = suggestions[0];
    return { summary: `主な原因: ${first.path} ${first.message}`, suggestions };
  }

  previewSchema(request: PreviewSchemaRequest = {}): { schema: 'main' | 'template' | 'theme'; jsonPointer?: string; value: unknown } {
    const schema = request.schema ?? 'main';
    return {
      schema,
      jsonPointer: request.jsonPointer,
      value: previewSchemaValue(schema, request.jsonPointer)
    };
  }

  async listComponents(): Promise<{ components: TextUIComponentCatalogEntry[]; supportedProviders: string[] }> {
    return {
      components: getTextUiComponentCatalog(),
      supportedProviders: await this.getSupportedProviders()
    };
  }

  async getSupportedProviders(): Promise<string[]> {
    return getSupportedProviderNames();
  }
}
