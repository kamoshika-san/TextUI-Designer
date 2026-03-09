import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import type { SchemaDefinition } from '../../types';
import type { YamlSchemaLoader } from './yaml-parser';

export class YamlSchemaValidator {
  private readonly ajv = new Ajv({ allErrors: true });
  private validatorCache: ValidateFunction | null = null;
  private schemaFingerprint: string | null = null;

  constructor(private readonly schemaLoader?: YamlSchemaLoader) {}

  async validate(yaml: unknown): Promise<ErrorObject[] | null> {
    if (!this.schemaLoader) {
      console.warn('[YamlParser] スキーマローダーが未設定のため、スキーマ検証をスキップします');
      return null;
    }

    const schema = await this.schemaLoader.loadSchema();
    if (!schema) {
      console.warn('[YamlParser] スキーマの読み込みに失敗しました');
      return null;
    }

    const validate = this.getOrCreateValidator(schema);
    const valid = validate(yaml);

    return valid ? null : (validate.errors ?? []);
  }

  private getOrCreateValidator(schema: SchemaDefinition): ValidateFunction {
    const fingerprint = JSON.stringify(schema);
    if (!this.validatorCache || this.schemaFingerprint !== fingerprint) {
      this.validatorCache = this.ajv.compile(schema);
      this.schemaFingerprint = fingerprint;
    }

    return this.validatorCache;
  }
}
