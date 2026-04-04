import * as fs from 'fs';

/**
 * PoC: Shared logic for preserving user-defined logic between protected markers.
 */
export const PROTECTED_START = '// [TUI_USER_LOGIC_START]';
export const PROTECTED_END = '// [TUI_USER_LOGIC_END]';

export function extractProtectedRegion(filePath: string): string | undefined {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const startIndex = content.indexOf(PROTECTED_START);
  const endIndex = content.indexOf(PROTECTED_END);

  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    return undefined;
  }

  return content.slice(startIndex + PROTECTED_START.length, endIndex).trim();
}

export function buildProtectedBlock(existingLogic?: string): string {
  const content = existingLogic ? `\n  ${existingLogic}\n` : '\n  // Add your custom logic here (it will be preserved on re-export)\n';
  return `${PROTECTED_START}${content}${PROTECTED_END}`;
}
