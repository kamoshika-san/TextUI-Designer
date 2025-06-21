import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import Ajv from 'ajv';

export class ThemeManager {
  private context: vscode.ExtensionContext;
  private themePath: string | undefined;
  private tokens: any = {};
  private watcher: vscode.FileSystemWatcher | undefined;

  // デフォルトテーマ
  private defaultTokens = {
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

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (folder) {
      this.themePath = path.join(folder.uri.fsPath, 'textui-theme.yml');
    }
  }

  async loadTheme(): Promise<void> {
    if (!this.themePath || !fs.existsSync(this.themePath)) {
      console.log('[ThemeManager] theme file not found, using default theme');
      this.tokens = this.defaultTokens;
      return;
    }
    try {
      const content = fs.readFileSync(this.themePath, 'utf-8');
      console.log('[ThemeManager] theme file content length:', content.length);
      const data = YAML.parse(content);
      console.log('[ThemeManager] parsed theme data:', JSON.stringify(data, null, 2));
      await this.validateTheme(data);
      this.tokens = data.theme?.tokens || this.defaultTokens;
      console.log('[ThemeManager] extracted tokens:', JSON.stringify(this.tokens, null, 2));
      console.log('[ThemeManager] theme loaded');
    } catch (err) {
      console.error('[ThemeManager] failed to load theme, using default theme', err);
      this.tokens = this.defaultTokens;
    }
  }

  generateCSSVariables(): string {
    const flat = this.flattenTokens(this.tokens);
    console.log('[ThemeManager] flattened tokens:', JSON.stringify(flat, null, 2));
    
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
    
    const lines = Object.entries(flat).map(([k, v]) => `  --${k}: ${v} !important;`);
    // 複数のセレクターでCSS変数を定義し、最高の優先度を確保
    const css = `html body :root {\n${lines.join('\n')}\n}\nhtml :root {\n${lines.join('\n')}\n}\n:root {\n${lines.join('\n')}\n}\nbody {\n${lines.join('\n')}\n}\n#root {\n${lines.join('\n')}\n}`;
    console.log('[ThemeManager] generated CSS:', css);
    return css;
  }

  private flattenTokens(obj: any, prefix = ''): Record<string, string> {
    let result: Record<string, string> = {};
    if (!obj) return result;
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}-${key}` : key;
      if (value && typeof value === 'object' && 'value' in (value as any)) {
        result[newKey] = (value as any).value as string;
      } else if (value && typeof value === 'object') {
        Object.assign(result, this.flattenTokens(value, newKey));
      } else {
        result[newKey] = String(value);
      }
    }
    return result;
  }

  private async validateTheme(data: any): Promise<void> {
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
    if (!this.themePath) return;
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
      this.tokens = this.defaultTokens;
      const css = this.generateCSSVariables();
      callback(css);
    });
  }

  dispose(): void {
    this.watcher?.dispose();
  }
}
