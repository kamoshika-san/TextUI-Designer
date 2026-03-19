export const CONFIGURATION_CATEGORIES = [
  'supportedFileExtensions',
  'autoPreview',
  'devTools',
  'webview',
  'export',
  'diagnostics',
  'schema',
  'templates',
  'performance',
  'mcp'
] as const;

export type ConfigurationCategory = (typeof CONFIGURATION_CATEGORIES)[number];

