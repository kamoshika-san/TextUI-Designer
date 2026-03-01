import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import Ajv from 'ajv';
import { IThemeManager, ThemeTokens, ThemeComponents, isThemeDefinition } from '../types';

export class ThemeManager implements IThemeManager {
  private context: vscode.ExtensionContext;
  private themePath: string | undefined;
  private tokens: ThemeTokens = {};
  private components: ThemeComponents = {};
  private watcher: vscode.FileSystemWatcher | undefined;

  // デフォルトテーマ
  private defaultTokens: ThemeTokens = {
    colors: {
      primary: { value: '#3B82F6' },
      secondary: { value: '#6B7280' },
      success: { value: '#10B981' },
      warning: { value: '#F59E0B' },
      error: { value: '#EF4444' },
      surface: { value: '#1F2937' },
      background: { value: '#F9FAFB' },
      text: {
        primary: { value: '#F9FAFB' },
        secondary: { value: '#D1D5DB' },
        muted: { value: '#9CA3AF' },
        dark: { value: '#111827' }
      }
    },
    spacing: {
      xs: { value: '0.5rem' },
      sm: { value: '0.75rem' },
      md: { value: '1rem' },
      lg: { value: '1.5rem' },
      xl: { value: '2rem' }
    },
    typography: {
      fontFamily: { value: 'system-ui, -apple-system, sans-serif' },
      fontSize: {
        xs: { value: '0.75rem' },
        sm: { value: '0.875rem' },
        base: { value: '1rem' },
        lg: { value: '1.125rem' },
        xl: { value: '1.25rem' },
        '2xl': { value: '1.5rem' },
        '3xl': { value: '1.875rem' },
        '4xl': { value: '2.25rem' }
      }
    },
    borderRadius: {
      sm: { value: '0.25rem' },
      md: { value: '0.375rem' },
      lg: { value: '0.5rem' },
      xl: { value: '0.75rem' }
    },
    shadows: {
      sm: { value: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
      md: { value: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' },
      lg: { value: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }
    }
  };

  // デフォルトコンポーネントスタイル
  private defaultComponents: ThemeComponents = {
    button: {
      primary: {
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-text-primary)',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        borderRadius: 'var(--border-radius-md)',
        border: 'none',
        cursor: 'pointer',
        fontSize: 'var(--typography-fontSize-base)',
        fontWeight: 'medium',
        transition: 'all 0.2s ease-in-out'
      },
      secondary: {
        backgroundColor: 'var(--color-secondary)',
        color: 'var(--color-text-primary)',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        borderRadius: 'var(--border-radius-md)',
        border: 'none',
        cursor: 'pointer',
        fontSize: 'var(--typography-fontSize-base)',
        fontWeight: 'medium',
        transition: 'all 0.2s ease-in-out'
      },
      submit: {
        backgroundColor: 'var(--color-success)',
        color: 'var(--color-text-primary)',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        borderRadius: 'var(--border-radius-md)',
        border: 'none',
        cursor: 'pointer',
        fontSize: 'var(--typography-fontSize-base)',
        fontWeight: 'medium',
        transition: 'all 0.2s ease-in-out'
      }
    },
    alert: {
      info: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'var(--color-primary)',
        color: 'var(--color-primary)',
        borderWidth: '1px',
        borderRadius: 'var(--border-radius-lg)',
        padding: 'var(--spacing-md)',
        fontSize: 'var(--typography-fontSize-base)',
        fontWeight: 'normal'
      },
      success: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderColor: 'var(--color-success)',
        color: 'var(--color-success)',
        borderWidth: '1px',
        borderRadius: 'var(--border-radius-lg)',
        padding: 'var(--spacing-md)',
        fontSize: 'var(--typography-fontSize-base)',
        fontWeight: 'normal'
      },
      warning: {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderColor: 'var(--color-warning)',
        color: 'var(--color-warning)',
        borderWidth: '1px',
        borderRadius: 'var(--border-radius-lg)',
        padding: 'var(--spacing-md)',
        fontSize: 'var(--typography-fontSize-base)',
        fontWeight: 'normal'
      },
      error: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'var(--color-error)',
        color: 'var(--color-error)',
        borderWidth: '1px',
        borderRadius: 'var(--border-radius-lg)',
        padding: 'var(--spacing-md)',
        fontSize: 'var(--typography-fontSize-base)',
        fontWeight: 'normal'
      }
    }
  };

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (folder) {
      this.themePath = path.join(folder.uri.fsPath, 'textui-theme.yml');
    }
  }

  getThemePath(): string | undefined {
    return this.themePath;
  }

  setThemePath(themePath: string | undefined): void {
    this.themePath = themePath;
  }

  private resetToDefaultTheme(): void {
    this.tokens = this.defaultTokens;
    this.components = this.defaultComponents;
  }

  async loadTheme(): Promise<void> {
    if (!this.themePath || !fs.existsSync(this.themePath)) {
      console.log('[ThemeManager] theme file not found, using default theme');
      this.resetToDefaultTheme();
      return;
    }
    try {
      const data = await this.resolveThemeDefinition(this.themePath);

      console.log('[ThemeManager] parsed theme data:', JSON.stringify(data, null, 2));
      await this.validateTheme(data);
      if (isThemeDefinition(data)) {
        this.tokens = this.deepMerge(this.defaultTokens, data.theme.tokens || {}) as ThemeTokens;
        this.components = this.deepMerge(this.defaultComponents, data.theme.components || {}) as ThemeComponents;
      } else {
        console.warn('[ThemeManager] テーマ定義の形式が不正なため、デフォルトを使用します');
        this.resetToDefaultTheme();
      }
      console.log('[ThemeManager] extracted tokens:', JSON.stringify(this.tokens, null, 2));
      console.log('[ThemeManager] extracted components:', JSON.stringify(this.components, null, 2));
      console.log('[ThemeManager] theme loaded');
    } catch (err) {
      console.error('[ThemeManager] failed to load theme, using default theme', err);
      this.resetToDefaultTheme();
    }
  }

  private async resolveThemeDefinition(themeFilePath: string, chain: string[] = []): Promise<unknown> {
    const normalizedPath = path.resolve(themeFilePath);
    if (chain.includes(normalizedPath)) {
      throw new Error(`[ThemeManager] Circular theme inheritance detected: ${[...chain, normalizedPath].join(' -> ')}`);
    }

    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`[ThemeManager] Extended theme file not found: ${normalizedPath}`);
    }

    const content = fs.readFileSync(normalizedPath, 'utf-8');
    console.log('[ThemeManager] theme file content length:', content.length, 'path:', normalizedPath);

    const data = await new Promise<unknown>((resolve, reject) => {
      setImmediate(() => {
        try {
          const parsed = YAML.parse(content);
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      });
    });

    if (!isThemeDefinition(data)) {
      return data;
    }

    const extendsPath = typeof data.theme.extends === 'string' ? data.theme.extends.trim() : '';
    if (!extendsPath) {
      return data;
    }

    if (extendsPath.startsWith('npm:')) {
      throw new Error(`[ThemeManager] Unsupported extends path: ${extendsPath}`);
    }

    const parentPath = path.resolve(path.dirname(normalizedPath), extendsPath);
    const parentData = await this.resolveThemeDefinition(parentPath, [...chain, normalizedPath]);
    if (!isThemeDefinition(parentData)) {
      return data;
    }

    const mergedTheme = this.deepMerge(parentData.theme, data.theme);
    return {
      ...parentData,
      ...data,
      theme: mergedTheme
    };
  }

  private deepMerge(base: unknown, override: unknown): unknown {
    if (Array.isArray(base) || Array.isArray(override)) {
      return override ?? base;
    }

    if (!this.isPlainObject(base) || !this.isPlainObject(override)) {
      return override ?? base;
    }

    const result: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(override)) {
      const baseValue = (base as Record<string, unknown>)[key];
      result[key] = this.deepMerge(baseValue, value);
    }
    return result;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  generateCSSVariables(): string {
    const flat = this.flattenTokens(this.tokens);
    const componentVars = this.generateComponentVariables();
    
    console.log('[ThemeManager] flattened tokens:', JSON.stringify(flat, null, 2));
    console.log('[ThemeManager] component variables:', JSON.stringify(componentVars, null, 2));
    
    // spacing変数のデバッグ
    console.log('[ThemeManager] spacing-md value:', flat['spacing-md']);
    console.log('[ThemeManager] spacing variables:', {
      'spacing-xs': flat['spacing-xs'],
      'spacing-sm': flat['spacing-sm'],
      'spacing-md': flat['spacing-md'],
      'spacing-lg': flat['spacing-lg'],
      'spacing-xl': flat['spacing-xl']
    });
    
    // typography変数のデバッグ
    console.log('[ThemeManager] typography variables:', {
      'typography-fontFamily': flat['typography-fontFamily'],
      'typography-fontSize-xs': flat['typography-fontSize-xs'],
      'typography-fontSize-sm': flat['typography-fontSize-sm'],
      'typography-fontSize-base': flat['typography-fontSize-base'],
      'typography-fontSize-lg': flat['typography-fontSize-lg'],
      'typography-fontSize-xl': flat['typography-fontSize-xl'],
      'typography-fontSize-2xl': flat['typography-fontSize-2xl'],
      'typography-fontSize-3xl': flat['typography-fontSize-3xl'],
      'typography-fontSize-4xl': flat['typography-fontSize-4xl']
    });
    
    // すべての変数を結合
    const allVars = { ...flat, ...componentVars };
    const lines = Object.entries(allVars).map(([k, v]) => `  --${k}: ${v} !important;`);
    
    // 複数のセレクターでCSS変数を定義し、最高の優先度を確保
    const css = `html body :root {\n${lines.join('\n')}\n}\nhtml :root {\n${lines.join('\n')}\n}\n:root {\n${lines.join('\n')}\n}\nbody {\n${lines.join('\n')}\n}\n#root {\n${lines.join('\n')}\n}`;
    console.log('[ThemeManager] generated CSS:', css);
    return css;
  }

  private flattenTokens(obj: unknown, prefix = ''): Record<string, string> {
    const result: Record<string, string> = {};
    if (!obj || typeof obj !== 'object') {
      return result;
    }

    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const newKey = prefix ? `${prefix}-${key}` : key;
      if (this.isTokenLeaf(value)) {
        result[newKey] = value.value;
      } else if (value && typeof value === 'object') {
        Object.assign(result, this.flattenTokens(value, newKey));
      } else {
        result[newKey] = String(value);
      }
    }
    return result;
  }

  private isTokenLeaf(value: unknown): value is { value: string } {
    if (!value || typeof value !== 'object' || !('value' in value)) {
      return false;
    }
    const leaf = value as { value: unknown };
    return typeof leaf.value === 'string';
  }

  private generateComponentVariables(): Record<string, string> {
    const result: Record<string, string> = {};
    
    for (const [componentName, variants] of Object.entries(this.components as Record<string, unknown>)) {
      if (!variants || typeof variants !== 'object') {
        continue;
      }

      for (const [variantName, styles] of Object.entries(variants as Record<string, unknown>)) {
        if (!styles || typeof styles !== 'object') {
          continue;
        }

        for (const [propertyName, value] of Object.entries(styles as Record<string, unknown>)) {
          const varName = `component-${componentName}-${variantName}-${propertyName}`;
          result[varName] = String(value);
        }
      }
    }
    
    return result;
  }

  private async validateTheme(data: unknown): Promise<void> {
    try {
      const schemaPath = path.join(this.context.extensionPath, 'schemas', 'theme-schema.json');
      if (!fs.existsSync(schemaPath)) {
        console.warn('[ThemeManager] theme schema not found');
        return;
      }
      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
      const ajv = new Ajv();
      const validate = ajv.compile(schema);
      const valid = validate(data);
      if (!valid) {
        console.warn('[ThemeManager] theme validation failed', validate.errors);
      }
    } catch (e) {
      console.warn('[ThemeManager] validation error', e);
    }
  }

  watchThemeFile(callback: (css: string) => void): void {
    if (!this.themePath) {return;}
    const pattern = new vscode.RelativePattern(path.dirname(this.themePath), path.basename(this.themePath));
    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);
    const reload = async () => {
      console.log('[ThemeManager] theme file changed, reloading...');
      await this.loadTheme();
      const css = this.generateCSSVariables();
      console.log('[ThemeManager] calling callback with CSS');
      callback(css);
    };
    this.watcher.onDidChange(reload);
    this.watcher.onDidCreate(reload);
    this.watcher.onDidDelete(async () => {
      console.log('[ThemeManager] theme file deleted, using default theme');
      this.resetToDefaultTheme();
      const css = this.generateCSSVariables();
      callback(css);
    });
  }

  dispose(): void {
    this.watcher?.dispose();
  }
}
