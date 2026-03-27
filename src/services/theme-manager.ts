import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { IThemeManager, ThemeTokens, ThemeComponents, isThemeDefinition } from '../types';
import { DEFAULT_THEME_COMPONENTS, DEFAULT_THEME_TOKENS } from '../theme/default-theme';
import { ThemeLoader } from '../theme/theme-loader';
import { ThemeUtils } from '../theme/theme-utils';
import { ThemeValidator } from '../theme/theme-validator';

export class ThemeManager implements IThemeManager {
  private context: vscode.ExtensionContext;
  private themePath: string | undefined;
  private tokens: ThemeTokens = {};
  private components: ThemeComponents = {};
  private watcher: vscode.FileSystemWatcher | undefined;
  private readonly defaultTokens: ThemeTokens = DEFAULT_THEME_TOKENS;
  private readonly defaultComponents: ThemeComponents = DEFAULT_THEME_COMPONENTS;
  private readonly themeLoader = new ThemeLoader();
  private readonly themeValidator = new ThemeValidator();

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
      this.themePath = undefined;
      this.resetToDefaultTheme();
      return;
    }

    try {
      const data = await this.themeLoader.resolveThemeDefinition(this.themePath);
      await this.themeValidator.validateTheme(this.context, data);

      if (isThemeDefinition(data)) {
        this.tokens = ThemeUtils.normalizeTokenVocabulary(
          ThemeUtils.deepMerge(this.defaultTokens, data.theme.tokens || {})
        ) as ThemeTokens;
        this.components = ThemeUtils.deepMerge(this.defaultComponents, data.theme.components || {}) as ThemeComponents;
      } else {
        console.warn('[ThemeManager] テーマ定義の形式が不正なため、デフォルトを使用します');
        this.themePath = undefined;
        this.resetToDefaultTheme();
      }
    } catch (err) {
      console.error('[ThemeManager] failed to load theme, using default theme', err);
      this.themePath = undefined;
      this.resetToDefaultTheme();
    }
  }

  generateCSSVariables(): string {
    return ThemeUtils.buildCssVariables(this.tokens, this.components);
  }

  watchThemeFile(callback: (css: string) => void): void {
    if (this.watcher) {
      return;
    }
    if (!this.themePath) {
      return;
    }
    const pattern = new vscode.RelativePattern(path.dirname(this.themePath), path.basename(this.themePath));
    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);
    const reload = async () => {
      console.log('[ThemeManager] theme file changed, reloading...');
      await this.loadTheme();
      callback(this.generateCSSVariables());
    };
    this.watcher.onDidChange(reload);
    this.watcher.onDidCreate(reload);
    this.watcher.onDidDelete(async () => {
      console.log('[ThemeManager] theme file deleted, using default theme');
      this.resetToDefaultTheme();
      callback(this.generateCSSVariables());
    });
  }

  dispose(): void {
    this.watcher?.dispose();
  }
}
