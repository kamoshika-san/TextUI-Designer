import * as fs from 'fs';
import * as path from 'path';
import { THEME_FILENAMES } from './shared';

export function resolveThemePathForCapture(
  explicitThemePath: string | undefined,
  dslFilePath: string | undefined,
  useWebViewTheme?: boolean
): string | undefined {
  if (useWebViewTheme) {
    return (explicitThemePath && fs.existsSync(explicitThemePath)) ? explicitThemePath : undefined;
  }
  if (explicitThemePath && fs.existsSync(explicitThemePath)) {
    return explicitThemePath;
  }
  if (!dslFilePath) {
    return undefined;
  }
  const dir = path.dirname(dslFilePath);
  for (const name of THEME_FILENAMES) {
    const candidate = path.join(dir, name);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

