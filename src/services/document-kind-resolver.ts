import { ConfigManager } from '../utils/config-manager';
import type { ValidationSchemaKind } from './diagnostics/diagnostic-validation-engine';

/** TextUI が扱うドキュメント種別（ファイル名規約に基づく）。 */
export type DocumentKind = 'main' | 'template' | 'theme' | 'navigation' | 'unsupported';

const TEMPLATE_PATTERN = /\.template\.(ya?ml|json)$/i;

function isThemePath(lower: string): boolean {
  return (
    lower.endsWith('-theme.yml') ||
    lower.endsWith('-theme.yaml') ||
    lower.endsWith('_theme.yml') ||
    lower.endsWith('_theme.yaml') ||
    lower.endsWith('/textui-theme.yml') ||
    lower.endsWith('/textui-theme.yaml') ||
    lower.endsWith('\\textui-theme.yml') ||
    lower.endsWith('\\textui-theme.yaml') ||
    lower.endsWith('-theme.json') ||
    lower.endsWith('_theme.json') ||
    lower.endsWith('/textui-theme.json') ||
    lower.endsWith('\\textui-theme.json')
  );
}

/**
 * ファイルパスからドキュメント種別を単一ルールで判定する。
 * EventManager の「診断するか」と DiagnosticManager のスキーマ種別の前提を揃える。
 */
export function getDocumentKind(fileName: string): DocumentKind {
  const lower = fileName.toLowerCase();

  if (TEMPLATE_PATTERN.test(lower)) {
    return 'template';
  }
  if (isThemePath(lower)) {
    return 'theme';
  }
  if (ConfigManager.isNavigationFlowFile(lower)) {
    return 'navigation';
  }
  if (ConfigManager.isSupportedFile(lower)) {
    return 'main';
  }
  return 'unsupported';
}

/**
 * 診断エンジン用のスキーマ種別。`unsupported` は従来どおり `main` にフォールバック（呼び出し元で診断対象に絞る前提）。
 */
export function getValidationSchemaKind(fileName: string): ValidationSchemaKind {
  const kind = getDocumentKind(fileName);
  if (kind === 'unsupported') {
    return 'main';
  }
  return kind;
}
