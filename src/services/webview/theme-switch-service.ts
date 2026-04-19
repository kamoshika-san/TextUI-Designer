import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { IThemeManager } from '../../types';

interface ThemeSwitchInput {
  themeManager: IThemeManager;
  themePath: string;
  workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined;
}

interface ThemeSwitchResult {
  cssVariables: string;
  notice: {
    kind: 'info' | 'error';
    message: string;
  };
}

export class ThemeSwitchService {
  async switchTheme(input: ThemeSwitchInput): Promise<ThemeSwitchResult> {
    if (!input.themePath) {
      input.themeManager.setThemePath(undefined);
      return {
        cssVariables: '',
        notice: {
          kind: 'info',
          message: 'Switched to the default theme.'
        }
      };
    }

    const fullThemePath = this.resolveThemePath(input.themePath, input.workspaceFolders);
    if (!fullThemePath) {
      return {
        cssVariables: input.themeManager.generateCSSVariables(),
        notice: {
          kind: 'error',
          message: `Theme file not found: ${input.themePath}`
        }
      };
    }

    input.themeManager.setThemePath(fullThemePath);
    await input.themeManager.loadTheme();

    return {
      cssVariables: input.themeManager.generateCSSVariables(),
      notice: {
        kind: 'info',
        message: `Theme switched: ${path.basename(input.themePath)}`
      }
    };
  }

  private resolveThemePath(
    themePath: string,
    workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined
  ): string | undefined {
    if (!workspaceFolders) {
      return undefined;
    }

    for (const folder of workspaceFolders) {
      const candidatePath = path.join(folder.uri.fsPath, themePath);
      if (fs.existsSync(candidatePath)) {
        return candidatePath;
      }
    }

    return undefined;
  }
}
