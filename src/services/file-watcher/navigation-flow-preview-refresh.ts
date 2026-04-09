import * as path from 'path';
import { loadDslWithIncludesFromPath } from '../../dsl/load-dsl-with-includes';
import type { NavigationFlowDSL } from '../../domain/dsl-types';

type NavigationFlowLoader = (filePath: string) => { dsl: NavigationFlowDSL };

function isWindowsAbsolutePath(filePath: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(filePath);
}

function isUiDslFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return lower.endsWith('.tui.yml') || lower.endsWith('.tui.yaml');
}

function isNavigationFlowFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return (
    lower.endsWith('.tui.flow.yml') ||
    lower.endsWith('.tui.flow.yaml') ||
    lower.endsWith('.tui.flow.json')
  );
}

function normalizePath(filePath: string): string {
  if (isWindowsAbsolutePath(filePath)) {
    return path.win32.normalize(filePath).replace(/[\\/]+/g, '/').toLowerCase();
  }
  return path.normalize(filePath).replace(/[\\/]+/g, '/').toLowerCase();
}

function resolveCrossPlatformRelativePath(anchorFile: string, relativePath: string): string {
  const anchorDir = path.dirname(anchorFile);
  if (isWindowsAbsolutePath(anchorDir)) {
    return path.win32.normalize(path.win32.resolve(anchorDir, relativePath));
  }
  return path.resolve(anchorDir, relativePath);
}

function matchesPath(left: string, right: string): boolean {
  return normalizePath(left) === normalizePath(right);
}

function resolveRelatedPageFiles(
  flowFilePath: string,
  loader: NavigationFlowLoader
): string[] {
  try {
    const { dsl } = loader(flowFilePath);
    return dsl.flow.screens.map(screen => resolveCrossPlatformRelativePath(flowFilePath, screen.page));
  } catch {
    return [];
  }
}

export function shouldRefreshPreviewForDocumentChange(
  lastPreviewFile: string | undefined,
  changedFilePath: string,
  loader: NavigationFlowLoader = loadDslWithIncludesFromPath<NavigationFlowDSL>
): boolean {
  if (!lastPreviewFile) {
    return true;
  }

  if (!isNavigationFlowFile(lastPreviewFile)) {
    return true;
  }

  if (matchesPath(lastPreviewFile, changedFilePath)) {
    return true;
  }

  if (isNavigationFlowFile(changedFilePath)) {
    return false;
  }

  if (!isUiDslFile(changedFilePath)) {
    return false;
  }

  return resolveRelatedPageFiles(lastPreviewFile, loader).some(filePath => matchesPath(filePath, changedFilePath));
}
