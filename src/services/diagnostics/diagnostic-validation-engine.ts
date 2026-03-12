import * as YAML from 'yaml';
import Ajv, { type ErrorObject } from 'ajv';
import type { ISchemaManager, SchemaDefinition } from '../../types';

export type ValidationSchemaKind = 'main' | 'template' | 'theme';

export type DiagnosticValidationResult = {
  schema: SchemaDefinition | null;
  errors: ErrorObject[] | null;
  errorMessage: string | null;
};

export class DiagnosticValidationEngine {
  private ajvInstance: Ajv | null = null;
  private schemaCaches: Record<ValidationSchemaKind, SchemaDefinition | null> = {
    main: null,
    template: null,
    theme: null
  };
  private lastSchemaLoads: Record<ValidationSchemaKind, number> = {
    main: 0,
    template: 0,
    theme: 0
  };

  constructor(
    private readonly schemaManager: ISchemaManager,
    private readonly cacheTtlMs: number
  ) {}

  async validateText(text: string, schemaKind: ValidationSchemaKind): Promise<DiagnosticValidationResult> {
    const now = Date.now();

    try {
      const yaml = await this.parseYamlAsync(text);
      const schema = await this.getSchema(schemaKind, now);

      const validate = this.getAjv().compile(schema);
      const valid = validate(yaml);

      return {
        schema,
        errors: valid ? null : (validate.errors ?? null),
        errorMessage: null
      };
    } catch (error) {
      return {
        schema: null,
        errors: null,
        errorMessage: error instanceof Error ? error.message : String(error)
      };
    }
  }

  clearCache(): void {
    this.schemaCaches = {
      main: null,
      template: null,
      theme: null
    };
    this.lastSchemaLoads = {
      main: 0,
      template: 0,
      theme: 0
    };
    this.ajvInstance = null;
  }

  private async parseYamlAsync(text: string): Promise<unknown> {
    return await new Promise((resolve, reject) => {
      setImmediate(() => {
        try {
          resolve(YAML.parse(text));
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private getAjv(): Ajv {
    if (!this.ajvInstance) {
      this.ajvInstance = new Ajv({ allErrors: true, allowUnionTypes: true });
    }
    return this.ajvInstance;
  }

  private async getSchema(schemaKind: ValidationSchemaKind, now: number): Promise<SchemaDefinition> {
    if (!this.schemaCaches[schemaKind] || (now - this.lastSchemaLoads[schemaKind]) > this.cacheTtlMs) {
      this.schemaCaches[schemaKind] = await this.loadSchemaByKind(schemaKind);
      this.lastSchemaLoads[schemaKind] = now;
      this.ajvInstance = new Ajv({ allErrors: true, allowUnionTypes: true });
    }

    const schema = this.schemaCaches[schemaKind];
    if (!schema) {
      throw new Error('スキーマキャッシュが初期化されていません');
    }

    return schema;
  }

  private async loadSchemaByKind(schemaKind: ValidationSchemaKind): Promise<SchemaDefinition> {
    switch (schemaKind) {
      case 'template':
        if (typeof this.schemaManager.loadTemplateSchema === 'function') {
          return await this.schemaManager.loadTemplateSchema();
        }
        return await this.schemaManager.loadSchema();
      case 'theme':
        if (typeof this.schemaManager.loadThemeSchema === 'function') {
          return await this.schemaManager.loadThemeSchema();
        }
        return await this.schemaManager.loadSchema();
      case 'main':
      default:
        return await this.schemaManager.loadSchema();
    }
  }
}
