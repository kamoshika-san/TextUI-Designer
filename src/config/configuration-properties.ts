/**
 * VS Code `contributes.configuration` の単一ソース。
 * 既定値・型は `config-schema.ts` の SETTINGS_DEFAULTS / buildConfigurationSchema、
 * カテゴリ順は CONFIGURATION_CATEGORIES が決める。
 */
import { buildConfigurationSchema, SETTINGS_DEFAULTS } from '../utils/config-schema';
import { CONFIGURATION_CATEGORIES, type ConfigurationCategory } from './configuration/categories';

const CONFIG_SECTION = 'textui-designer';

/** 設定 UI に表示されるセクション名（package.json contributes.configuration.title） */
export const CONTRIBUTES_CONFIGURATION_TITLE = 'TextUI Designer';

type JsonObject = Record<string, unknown>;

function getBaseSchemaProperties(): JsonObject {
  const schema = buildConfigurationSchema(SETTINGS_DEFAULTS) as JsonObject;
  const properties = schema.properties;
  if (!properties || typeof properties !== 'object') {
    throw new Error('configuration schema properties が取得できません');
  }
  return properties as JsonObject;
}

function matchCategory(localKey: string, category: ConfigurationCategory): boolean {
  if (category === 'supportedFileExtensions') {
    return localKey === 'supportedFileExtensions';
  }
  return localKey === category || localKey.startsWith(`${category}.`);
}

function toPackageConfigurationKey(localKey: string): string {
  return `${CONFIG_SECTION}.${localKey}`;
}

export function getConfigurationPropertiesByCategory(category: ConfigurationCategory): JsonObject {
  const source = getBaseSchemaProperties();
  const entries = Object.entries(source).filter(([localKey]) => matchCategory(localKey, category));
  return Object.fromEntries(entries.map(([localKey, definition]) => [toPackageConfigurationKey(localKey), definition]));
}

export function getGeneratedConfigurationProperties(): JsonObject {
  const merged: JsonObject = {};
  for (const category of CONFIGURATION_CATEGORIES) {
    Object.assign(merged, getConfigurationPropertiesByCategory(category));
  }
  return merged;
}

/** `package.json` の `contributes.configuration` ブロック全体（title + properties） */
export function getGeneratedContributesConfiguration(): { title: string; properties: JsonObject } {
  return {
    title: CONTRIBUTES_CONFIGURATION_TITLE,
    properties: getGeneratedConfigurationProperties()
  };
}

