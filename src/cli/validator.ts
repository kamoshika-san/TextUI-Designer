import type { ValidationResult, ValidationIssue } from './types';
import { isNavigationFlowDSL } from '../domain/dsl-types';
import { validateNavigationFlow } from '../shared/navigation-flow-validator';
import { collectComponentEntries, type ComponentEntry } from './validator/component-walker';
import { validateSchema } from './validator/schema-validator';
import { loadThemeTokens } from './validator/theme-token-loader';
import { validateTokenReferences } from './validator/token-resolver';

interface TokenUsage {
  token: string;
  path: string;
}

interface ComponentSemanticScan {
  issues: ValidationIssue[];
  tokenUsages: TokenUsage[];
}

export function validateDsl(
  dsl: unknown,
  options: { sourcePath?: string; skipTokenValidation?: boolean; schemaKind?: 'main' | 'navigation' } = {}
): ValidationResult {
  const schemaKind = options.schemaKind ?? (isNavigationFlowDSL(dsl) ? 'navigation' : 'main');
  const issues = [
    ...validateSchema(dsl, schemaKind),
    ...validateSemanticRules(dsl, sourcePathFromOptions(options), options.skipTokenValidation ?? false, schemaKind)
  ];

  return {
    valid: issues.every(issue => issue.level !== 'error'),
    issues
  };
}

function validateSemanticRules(
  dsl: unknown,
  sourcePath?: string,
  skipTokenValidation: boolean = false,
  schemaKind: 'main' | 'navigation' = 'main'
): ValidationIssue[] {
  if (!dsl || typeof dsl !== 'object') {
    return [{ level: 'error', message: 'DSL must be an object.', path: '/' }];
  }

  if (schemaKind === 'navigation') {
    return validateNavigationFlow(dsl, { sourcePath });
  }

  const components = collectComponentEntries(dsl);
  const scanResult = scanComponentSemanticRules(components);

  if (skipTokenValidation || scanResult.tokenUsages.length === 0) {
    return scanResult.issues;
  }

  return [
    ...scanResult.issues,
    ...validateTokenRules(scanResult.tokenUsages, sourcePath)
  ];
}

function scanComponentSemanticRules(components: ComponentEntry[]): ComponentSemanticScan {
  const issues: ValidationIssue[] = [];
  const seenIds = new Set<string>();
  const tokenUsages: TokenUsage[] = [];

  components.forEach(component => {
    const id = component.props.id;
    if (typeof id === 'string') {
      if (seenIds.has(id)) {
        issues.push({
          level: 'error',
          message: `Duplicate component id: ${id}`,
          path: `${component.path}/id`
        });
      }
      seenIds.add(id);
    }

    if (!Object.prototype.hasOwnProperty.call(component.props, 'token')) {
      return;
    }

    const tokenValue = component.props.token;
    if (tokenValue === undefined || tokenValue === null) {
      return;
    }

    if (typeof tokenValue !== 'string') {
      issues.push({
        level: 'error',
        message: 'token must be a string value',
        path: `${component.path}/token`
      });
      return;
    }

    tokenUsages.push({ token: tokenValue, path: `${component.path}/token` });
  });

  return { issues, tokenUsages };
}

function validateTokenRules(tokenUsages: TokenUsage[], sourcePath?: string): ValidationIssue[] {
  if (!sourcePath) {
    return [{
      level: 'error',
      message: 'token validation requires a DSL source path',
      path: '/'
    }];
  }

  const themeLoad = loadThemeTokens(sourcePath);
  if (!themeLoad.tokens) {
    return themeLoad.issues;
  }

  return [
    ...themeLoad.issues,
    ...validateTokenReferences(themeLoad.tokens, tokenUsages)
  ];
}

function sourcePathFromOptions(options: { sourcePath?: string }): string | undefined {
  return options.sourcePath;
}
