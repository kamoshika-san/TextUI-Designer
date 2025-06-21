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

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (folder) {
      this.themePath = path.join(folder.uri.fsPath, 'textui-theme.yml');
    }
  }

  async loadTheme(): Promise<void> {
    if (!this.themePath || !fs.existsSync(this.themePath)) {
      console.log('[ThemeManager] theme file not found');
      this.tokens = {};
      return;
    }
    try {
      const content = fs.readFileSync(this.themePath, 'utf-8');
      const data = YAML.parse(content);
      await this.validateTheme(data);
      this.tokens = data.theme?.tokens || {};
      console.log('[ThemeManager] theme loaded');
    } catch (err) {
      console.error('[ThemeManager] failed to load theme', err);
      this.tokens = {};
    }
  }

  generateCSSVariables(): string {
    const flat = this.flattenTokens(this.tokens);
    const lines = Object.entries(flat).map(([k, v]) => `  --${k}: ${v};`);
    return `:root {\n${lines.join('\n')}\n}`;
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
      await this.loadTheme();
      callback(this.generateCSSVariables());
    };
    this.watcher.onDidChange(reload);
    this.watcher.onDidCreate(reload);
    this.watcher.onDidDelete(async () => {
      this.tokens = {};
      callback('');
    });
  }

  dispose(): void {
    this.watcher?.dispose();
  }
}
