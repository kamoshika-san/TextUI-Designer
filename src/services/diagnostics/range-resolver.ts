import * as vscode from 'vscode';
import type { ErrorObject } from 'ajv';

export function resolveDiagnosticRange(
  error: ErrorObject,
  text: string,
  document: vscode.TextDocument
): vscode.Range {
  const pointerParts = (error.instancePath || '').split('/').filter(Boolean);
  const fallbackRange = new vscode.Range(0, 0, 0, 1);

  if (error.keyword === 'required') {
    const missingProperty = (error.params as { missingProperty?: string }).missingProperty;
    if (missingProperty) {
      const existingPath = [...pointerParts, missingProperty];
      const byPath = findRangeByPath(existingPath, text, document);
      if (byPath) {
        return byPath;
      }
    }
  }

  if (error.keyword === 'additionalProperties') {
    const additionalProperty = (error.params as { additionalProperty?: string }).additionalProperty;
    if (additionalProperty) {
      const additionalPath = [...pointerParts, additionalProperty];
      const byPath = findRangeByPath(additionalPath, text, document);
      if (byPath) {
        return byPath;
      }
    }
  }

  const byInstancePath = findRangeByPath(pointerParts, text, document);
  return byInstancePath || fallbackRange;
}

export function resolveDiagnosticLocation(error: ErrorObject): string {
  const path = error.instancePath && error.instancePath.length > 0 ? error.instancePath : '/';
  if (error.keyword === 'required') {
    const missingProperty = (error.params as { missingProperty?: string }).missingProperty;
    if (missingProperty) {
      return `${path}/${missingProperty}`.replace(/\/\//g, '/');
    }
  }
  if (error.keyword === 'additionalProperties') {
    const additionalProperty = (error.params as { additionalProperty?: string }).additionalProperty;
    if (additionalProperty) {
      return `${path}/${additionalProperty}`.replace(/\/\//g, '/');
    }
  }
  return path;
}

function findRangeByPath(pathParts: string[], text: string, document: vscode.TextDocument): vscode.Range | null {
  for (let i = pathParts.length - 1; i >= 0; i -= 1) {
    const key = pathParts[i];
    if (!key || /^\d+$/.test(key)) {
      continue;
    }

    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^\\s*${escapedKey}:`, 'm');
    const match = text.match(regex);
    if (!match) {
      continue;
    }

    const start = match.index ?? text.indexOf(match[0]);
    const startPos = document.positionAt(start);
    const endPos = document.positionAt(start + match[0].length);
    return new vscode.Range(startPos, endPos);
  }

  return null;
}
