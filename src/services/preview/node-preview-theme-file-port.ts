import * as fs from 'fs';
import * as path from 'path';
import type { PreviewThemeFilePort } from './preview-theme-file-port';

export class NodePreviewThemeFilePort implements PreviewThemeFilePort {
  getDirectoryPath(filePath: string): string {
    return path.dirname(filePath);
  }

  resolveThemePathForDirectory(directoryPath: string): string | undefined {
    for (const themeFileName of ['textui-theme.yml', 'textui-theme.yaml']) {
      const candidatePath = path.join(directoryPath, themeFileName);
      if (fs.existsSync(candidatePath)) {
        return candidatePath;
      }
    }

    return undefined;
  }
}
