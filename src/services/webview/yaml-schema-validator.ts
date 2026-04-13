import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import type { SchemaDefinition } from '../../types';
import type { YamlSchemaLoader } from './yaml-parser';

export class YamlSchemaValidator {
  private readonly ajv = new Ajv({ allErrors: true });
  private validatorCache: ValidateFunction | null = null;
  private schemaFingerprint: string | null = null;

  constructor(private readonly schemaLoader?: YamlSchemaLoader) {}

  async validate(yaml: unknown, fileName?: string): Promise<ErrorObject[] | null> {
    if (!this.schemaLoader) {
      console.warn('[YamlParser] schema loader is not configured, skipping schema validation');
      return null;
    }

    const schema = await this.loadSchemaForYaml(yaml, fileName);
    if (!schema) {
      console.warn('[YamlParser] failed to load a schema for preview validation');
      return null;
    }

    const validate = this.getOrCreateValidator(schema);
    const valid = validate(yaml);

    return valid ? null : (validate.errors ?? []);
  }

  private getOrCreateValidator(schema: SchemaDefinition): ValidateFunction {
    // If the schema has a $id, reuse an already-registered validator to avoid
    // "schema with key or id already exists" errors when switching DSL types
    const schemaId = (schema as { $id?: string }).$id;
    if (schemaId) {
      const existing = this.ajv.getSchema(schemaId);
      if (existing) {
        return existing;
      }
    }

    const fingerprint = JSON.stringify(schema);
    if (!this.validatorCache || this.schemaFingerprint !== fingerprint) {
      this.validatorCache = this.ajv.compile(schema);
      this.schemaFingerprint = fingerprint;
    }

    return this.validatorCache;
  }

  private async loadSchemaForYaml(yaml: unknown, fileName?: string): Promise<SchemaDefinition> {
    const schemaLoader = this.schemaLoader;
    if (!schemaLoader) {
      throw new Error('schema loader is not configured');
    }

    if (this.shouldUseNavigationSchema(yaml, fileName) && schemaLoader.loadNavigationSchema) {
      return schemaLoader.loadNavigationSchema();
    }

    return schemaLoader.loadSchema();
  }

  private shouldUseNavigationSchema(yaml: unknown, fileName?: string): boolean {
    const normalizedFileName = fileName?.toLowerCase() ?? '';
    if (
      normalizedFileName.endsWith('.tui.flow.yml') ||
      normalizedFileName.endsWith('.tui.flow.yaml') ||
      normalizedFileName.endsWith('.tui.flow.json')
    ) {
      return true;
    }

    return typeof yaml === 'object' && yaml !== null && 'flow' in yaml;
  }
}
