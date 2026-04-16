export const CONFIGURATION_CATEGORIES = [
  'supportedFileExtensions',
  'autoPreview',
  'devTools',
  'webview',
  'preview',
  'export',
  'diagnostics',
  'schema',
  'templates',
  'performance',
  'mcp'
] as const;

export type ConfigurationCategory = (typeof CONFIGURATION_CATEGORIES)[number];

