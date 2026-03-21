import type { TextUIDSL } from '../domain/dsl-types';

export interface WebViewMessage {
  type: string;
  data?: unknown;
  [key: string]: unknown;
}

export interface ParsedYamlResult {
  data: TextUIDSL;
  errors: YamlErrorInfo[];
}

export interface YamlErrorInfo {
  message: string;
  line?: number;
  column?: number;
  details?: Record<string, unknown>;
}

export interface SchemaErrorInfo {
  message: string;
  path: string;
  details?: Record<string, unknown>;
}

export function isWebViewMessage(obj: unknown): obj is WebViewMessage {
  return typeof obj === 'object' && obj !== null && 'type' in obj;
}
