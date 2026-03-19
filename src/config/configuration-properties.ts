import { buildConfigurationSchema, SETTINGS_DEFAULTS } from '../utils/config-schema';
import { CONFIGURATION_CATEGORIES, type ConfigurationCategory } from './configuration/categories';

const CONFIG_SECTION = 'textui-designer';

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

