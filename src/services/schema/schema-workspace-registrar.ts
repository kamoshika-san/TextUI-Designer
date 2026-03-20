import * as vscode from 'vscode';
import * as fs from 'fs';
import { Logger } from '../../utils/logger';
import {
  buildTextUiJsonSchemas,
  buildTextUiYamlSchemas,
  filterTextUiJsonSchemas,
  filterTextUiYamlSchemas,
  type JsonSchemaAssociation
} from './schema-association';

const logger = new Logger('SchemaWorkspaceRegistrar');

export type SchemaWorkspaceDebug = (message: string, ...args: unknown[]) => void;

async function registerYamlSchemas(
  schemaUri: string,
  templateSchemaUri: string,
  themeSchemaUri: string,
  debug?: SchemaWorkspaceDebug
): Promise<void> {
  try {
    const yamlConfig = vscode.workspace.getConfiguration('yaml');
    const currentSchemas = (yamlConfig.get('schemas') as Record<string, string[]>) || {};
    const filteredSchemas = filterTextUiYamlSchemas(currentSchemas);
    const newSchemas = buildTextUiYamlSchemas(filteredSchemas, schemaUri, templateSchemaUri, themeSchemaUri);
    await yamlConfig.update('schemas', newSchemas, vscode.ConfigurationTarget.Global);
    debug?.('[SchemaManager] YAMLスキーマ登録成功');
  } catch (error) {
    logger.warn('YAMLスキーマ登録に失敗しました（続行します）:', error);
  }
}

async function registerJsonSchemas(
  schemaPath: string,
  templateSchemaPath: string,
  themeSchemaPath: string,
  debug?: SchemaWorkspaceDebug
): Promise<void> {
  try {
    const jsonConfig = vscode.workspace.getConfiguration('json');
    const currentSchemas = (jsonConfig.get('schemas') as JsonSchemaAssociation[] | undefined) || [];
    const filteredSchemas = filterTextUiJsonSchemas(currentSchemas);
    const schemaContent = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    const templateSchemaContent = JSON.parse(fs.readFileSync(templateSchemaPath, 'utf-8'));
    const themeSchemaContent = JSON.parse(fs.readFileSync(themeSchemaPath, 'utf-8'));
    const newSchemas = buildTextUiJsonSchemas(filteredSchemas, schemaContent, templateSchemaContent, themeSchemaContent);
    await jsonConfig.update('schemas', newSchemas, vscode.ConfigurationTarget.Global);
    debug?.('[SchemaManager] JSONスキーマ登録成功');
  } catch (error) {
    logger.warn('JSONスキーマ登録に失敗しました（続行します）:', error);
  }
}

/**
 * VS Code の yaml / json 拡張設定へ TextUI 用スキーマを登録する。
 * 呼び出し元で main / template / theme ファイルの存在を保証すること。
 */
export async function registerTextUiSchemasInWorkspace(
  schemaPath: string,
  templateSchemaPath: string,
  themeSchemaPath: string,
  debug?: SchemaWorkspaceDebug
): Promise<void> {
  const schemaUri = vscode.Uri.file(schemaPath).toString();
  const templateSchemaUri = vscode.Uri.file(templateSchemaPath).toString();
  const themeSchemaUri = vscode.Uri.file(themeSchemaPath).toString();
  debug?.('[SchemaManager] スキーマ登録を開始');

  await registerYamlSchemas(schemaUri, templateSchemaUri, themeSchemaUri, debug);
  await registerJsonSchemas(schemaPath, templateSchemaPath, themeSchemaPath, debug);

  debug?.('[SchemaManager] スキーマ登録完了');
}

export async function cleanupTextUiSchemasInWorkspace(debug?: SchemaWorkspaceDebug): Promise<void> {
  try {
    const yamlConfig = vscode.workspace.getConfiguration('yaml');
    const currentSchemas = (yamlConfig.get('schemas') as Record<string, string[]>) || {};
    await yamlConfig.update('schemas', filterTextUiYamlSchemas(currentSchemas), vscode.ConfigurationTarget.Global);
    debug?.('[SchemaManager] YAMLスキーマクリーンアップ完了');

    const jsonConfig = vscode.workspace.getConfiguration('json');
    const currentJsonSchemas = (jsonConfig.get('schemas') as JsonSchemaAssociation[] | undefined) || [];
    await jsonConfig.update('schemas', filterTextUiJsonSchemas(currentJsonSchemas), vscode.ConfigurationTarget.Global);
    debug?.('[SchemaManager] JSONスキーマクリーンアップ完了');
  } catch (error) {
    logger.error('スキーマクリーンアップ中にエラーが発生しました:', error);
  }
}

export async function registerYamlSchemaForPattern(
  filePattern: string,
  schemaPath: string,
  debug?: SchemaWorkspaceDebug
): Promise<void> {
  try {
    const yamlConfig = vscode.workspace.getConfiguration('yaml');
    const currentSchemas = (yamlConfig.get('schemas') as Record<string, string[]>) || {};
    const schemaUri = vscode.Uri.file(schemaPath).toString();
    currentSchemas[schemaUri] = [filePattern];
    await yamlConfig.update('schemas', currentSchemas, vscode.ConfigurationTarget.Global);
    debug?.(`[SchemaManager] スキーマを登録しました: ${filePattern} -> ${schemaPath}`);
  } catch (error: unknown) {
    logger.error(`スキーマ登録に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

export async function unregisterYamlSchemaByFilePattern(
  filePattern: string,
  debug?: SchemaWorkspaceDebug
): Promise<void> {
  try {
    const yamlConfig = vscode.workspace.getConfiguration('yaml');
    const currentSchemas = (yamlConfig.get('schemas') as Record<string, string[]>) || {};
    const filteredSchemas = Object.fromEntries(
      Object.entries(currentSchemas).filter(([_uri, patterns]) => !patterns.includes(filePattern))
    );
    await yamlConfig.update('schemas', filteredSchemas, vscode.ConfigurationTarget.Global);
    debug?.(`[SchemaManager] スキーマを登録解除しました: ${filePattern}`);
  } catch (error: unknown) {
    logger.error(`スキーマ登録解除に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
