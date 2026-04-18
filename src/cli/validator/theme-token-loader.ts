import type { ValidationIssue } from '../types';
import { loadThemeTokensWithDefaultFallback } from '../theme-token-source';

export function loadThemeTokens(sourcePath: string): { tokens: Record<string, unknown> | null; issues: ValidationIssue[] } {
  const loadResult = loadThemeTokensWithDefaultFallback(sourcePath);
  return {
    tokens: loadResult.tokens,
    issues: loadResult.issues.map(issue => ({
      level: 'error',
      message: issue.message,
      path: '/'
    }))
  };
}
