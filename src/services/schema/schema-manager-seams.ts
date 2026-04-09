import type * as vscode from 'vscode';
import type { SchemaDefinition, SchemaValidationResult } from '../../types';
import type { SchemaPaths } from './schema-path-resolver';
import type { SchemaCacheStore } from './schema-cache-store';
import type { SchemaWorkspaceDebug } from './schema-workspace-registrar';

/**
 * SchemaManager の workspace 登録・解除を差し替えるための seam（テスト・統合で利用）。
 */
export interface SchemaWorkspaceSeams {
  registerTextUiSchemasInWorkspace?: (
    schemaPath: string,
    navigationSchemaPath: string,
    templateSchemaPath: string,
    themeSchemaPath: string,
    debug?: SchemaWorkspaceDebug
  ) => Promise<void>;
  cleanupTextUiSchemasInWorkspace?: (debug?: SchemaWorkspaceDebug) => Promise<void>;
}

/**
 * `resolveSchemaPaths` / cache / workspace / validator を差し替え可能にするオプション束。
 * 未指定のキーは本番実装（モジュール既定）を使用する。
 */
export interface SchemaManagerSeams {
  resolveSchemaPaths?: (context: vscode.ExtensionContext) => SchemaPaths;
  createCacheStore?: (paths: {
    main: () => string;
    navigation: () => string;
    template: () => string;
    theme: () => string;
  }) => SchemaCacheStore;
  validateConsistency?: (schema: SchemaDefinition) => void;
  validateData?: (data: unknown, schema: SchemaDefinition) => SchemaValidationResult;
  workspace?: SchemaWorkspaceSeams;
}
