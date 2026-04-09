import * as path from 'path';
export interface ResolveNavigationJumpTargetOptions {
  requestedTargetFilePath?: string;
  activeEditorFile?: string;
  lastPreviewFile?: string;
}

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

function isSupportedDslFile(filePath: string | undefined): filePath is string {
  return Boolean(filePath && (isUiDslFile(filePath) || isNavigationFlowFile(filePath)));
}

function isCrossPlatformAbsolutePath(filePath: string): boolean {
  return path.isAbsolute(filePath) || isWindowsAbsolutePath(filePath);
}

function resolveCrossPlatformRelativePath(anchorFile: string, relativePath: string): string {
  const anchorDir = path.dirname(anchorFile);
  if (isWindowsAbsolutePath(anchorDir)) {
    return path.win32.normalize(path.win32.resolve(anchorDir, relativePath));
  }
  return path.resolve(anchorDir, relativePath);
}

function resolveAnchorFile(options: ResolveNavigationJumpTargetOptions): string | undefined {
  if (isSupportedDslFile(options.activeEditorFile)) {
    return options.activeEditorFile;
  }

  if (isSupportedDslFile(options.lastPreviewFile)) {
    return options.lastPreviewFile;
  }

  return undefined;
}

export function resolveNavigationJumpTargetFile(
  options: ResolveNavigationJumpTargetOptions
): string | undefined {
  const anchorFile = resolveAnchorFile(options);
  if (!anchorFile) {
    return undefined;
  }

  if (!options.requestedTargetFilePath) {
    return anchorFile;
  }

  if (isCrossPlatformAbsolutePath(options.requestedTargetFilePath)) {
    return options.requestedTargetFilePath;
  }

  return resolveCrossPlatformRelativePath(anchorFile, options.requestedTargetFilePath);
}
