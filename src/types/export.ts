export type BuiltInExportFormat = 'html' | 'react' | 'pug';
export type ExportFormat = BuiltInExportFormat | (string & {});

export interface ExportOptions {
  includeComments?: boolean;
  minify?: boolean;
  theme?: string;
  [key: string]: unknown;
}
