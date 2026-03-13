import type { ErrorInfo } from './error-guidance';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export function mapSimpleError(payload: Record<string, unknown>): ErrorInfo {
  return {
    type: 'simple',
    message: typeof payload.error === 'string' ? payload.error : '不明なエラー'
  };
}

export function mapSchemaValidationError(_payload: Record<string, unknown>, schemaErrors: string): ErrorInfo {
  return {
    type: 'simple',
    message: `スキーマバリデーションエラー:\n${schemaErrors}`
  };
}

export function mapParseError(payload: Record<string, unknown>): ErrorInfo {
  return {
    type: 'parse',
    details: payload.error as ErrorInfo['details'],
    fileName: typeof payload.fileName === 'string' ? payload.fileName : undefined,
    content: typeof payload.content === 'string' ? payload.content : undefined
  };
}

export function mapDetailedSchemaError(payload: Record<string, unknown>): ErrorInfo {
  return {
    type: 'schema',
    details: payload.error as ErrorInfo['details'],
    fileName: typeof payload.fileName === 'string' ? payload.fileName : undefined,
    content: typeof payload.content === 'string' ? payload.content : undefined
  };
}

export function formatSchemaErrors(errors: unknown): string {
  if (!Array.isArray(errors)) {
    return '';
  }
  return errors.map(errorItem => {
    if (!isRecord(errorItem)) {
      return '- 不明なスキーマエラー';
    }
    const instancePath = typeof errorItem.instancePath === 'string' ? errorItem.instancePath : '';
    const message = typeof errorItem.message === 'string' ? errorItem.message : '';
    return `- ${instancePath} ${message}`.trim();
  }).join('\n');
}
