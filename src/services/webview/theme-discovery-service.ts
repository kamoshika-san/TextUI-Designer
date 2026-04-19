import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as YAML from 'yaml';
import type { IThemeManager } from '../../types';
import { ConfigManager } from '../../utils/config-manager';

export interface ThemeDefinition {
  name: string;
  path: string;
  isActive: boolean;
  description?: string;
}

export class ThemeDiscoveryService {
  constructor(
    private readonly getLastTuiFile: () => string | undefined
  ) {}

  async detectAvailableThemes(themeManager?: IThemeManager): Promise<ThemeDefinition[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      console.log('[ThemeDiscoveryService] ワークスペースフォルダが見つかりません');
      return [];
    }

    const themes: ThemeDefinition[] = [];
    const currentThemePath = themeManager?.getThemePath() || '';
    const isDefaultThemeActive = !currentThemePath;
    const discoveredPaths = new Set<string>();
    const activeTuiPath = this.resolveActiveTuiPath();

    for (const folder of workspaceFolders) {
      const folderPath = folder.uri.fsPath;
      const searchRoot = this.resolveThemeSearchRoot(folderPath, activeTuiPath);
      const themeFiles = this.collectThemeFiles(searchRoot);

      for (const filePath of themeFiles) {
        const normalizedPath = path.resolve(filePath);
        if (discoveredPaths.has(normalizedPath)) {
          continue;
        }
        discoveredPaths.add(normalizedPath);

        const relativePath = path.relative(folderPath, filePath);
        const fileName = path.basename(filePath);

        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const themeData = YAML.parse(content);
          const themeName = themeData?.theme?.name
            || fileName.replace(/(-theme|_theme)\.(ya?ml)$/, '').replace(/\.(ya?ml)$/, '');
          const themeDescription = themeData?.theme?.description;
          const isActive = Boolean(currentThemePath)
            && path.resolve(currentThemePath) === path.resolve(filePath);

          themes.push({
            name: themeName,
            path: relativePath,
            isActive,
            description: themeDescription
          });
        } catch (error) {
          console.log(`[ThemeDiscoveryService] テーマファイル読み取りエラー: ${filePath}`, error);
          themes.push({
            name: fileName.replace(/(-theme|_theme)\.(ya?ml)$/, '').replace(/\.(ya?ml)$/, ''),
            path: relativePath,
            isActive: false
          });
        }
      }
    }

    themes.unshift({
      name: 'Default',
      path: '',
      isActive: isDefaultThemeActive,
      description: 'System default theme'
    });

    return themes;
  }

  private resolveActiveTuiPath(): string | undefined {
    const activeEditorFile = vscode.window.activeTextEditor?.document.fileName;
    if (activeEditorFile && ConfigManager.isSupportedFile(activeEditorFile)) {
      return activeEditorFile;
    }

    const lastTuiFile = this.getLastTuiFile();
    if (lastTuiFile && ConfigManager.isSupportedFile(lastTuiFile)) {
      return lastTuiFile;
    }

    return undefined;
  }

  private resolveThemeSearchRoot(folderPath: string, activeTuiPath?: string): string {
    if (!activeTuiPath) {
      return folderPath;
    }

    const normalizedFolder = path.resolve(folderPath);
    const normalizedActiveFile = path.resolve(activeTuiPath);
    const activeDir = path.dirname(normalizedActiveFile);

    if (!activeDir.startsWith(normalizedFolder)) {
      return folderPath;
    }

    return activeDir;
  }

  private collectThemeFiles(rootPath: string): string[] {
    if (!fs.existsSync(rootPath)) {
      return [];
    }

    const themeFiles: string[] = [];
    const skipDirs = new Set(['.git', 'node_modules', 'out', 'media', '.next', 'dist', 'build']);
    const stack: string[] = [rootPath];

    while (stack.length > 0) {
      const currentPath = stack.pop();
      if (!currentPath) {
        continue;
      }

      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(currentPath, { withFileTypes: true });
      } catch (error) {
        console.log(`[ThemeDiscoveryService] ディレクトリ読み取りエラー: ${currentPath}`, error);
        continue;
      }

      for (const entry of entries) {
        const entryPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          if (!skipDirs.has(entry.name)) {
            stack.push(entryPath);
          }
          continue;
        }

        if (
          entry.name.endsWith('-theme.yml')
          || entry.name.endsWith('-theme.yaml')
          || entry.name.endsWith('_theme.yml')
          || entry.name.endsWith('_theme.yaml')
          || entry.name === 'textui-theme.yml'
          || entry.name === 'textui-theme.yaml'
        ) {
          themeFiles.push(entryPath);
        }
      }
    }

    return themeFiles;
  }
}
