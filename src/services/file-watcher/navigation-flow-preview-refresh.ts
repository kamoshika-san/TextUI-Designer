import * as path from 'path';
import { loadDslWithIncludesFromPath } from '../../dsl/load-dsl-with-includes';
import type { NavigationFlowDSL } from '../../domain/dsl-types';

type NavigationFlowLoader = (filePath: string) => { dsl: NavigationFlowDSL };

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
  return path.normalize(filePath).toLowerCase();
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
    return dsl.flow.screens.map(screen => path.resolve(path.dirname(flowFilePath), screen.page));
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
