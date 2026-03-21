import { ErrorHandler } from '../../utils/error-handler';
import type { WebViewErrorHandler } from './webview-error-handler';

function isNamedError(value: unknown, expectedName: string): value is Error {
  return value instanceof Error && value.name === expectedName;
}

export interface PreviewFailurePolicyContext {
  errorHandler: WebViewErrorHandler;
  lastTuiFile: string;
}

/**
 * Preview 更新パイプラインの **PreviewFailurePolicy** ポート。
 * 例外を種別に応じて WebView / UI へ伝播する。
 */
export function applyPreviewFailurePolicy(error: unknown, ctx: PreviewFailurePolicyContext): void {
  const file = ctx.lastTuiFile || '';
  if (isNamedError(error, 'YamlParseError')) {
    ctx.errorHandler.sendParseError(error, file, '');
  } else if (isNamedError(error, 'SchemaValidationError')) {
    ctx.errorHandler.sendSchemaError(error, file, '');
  } else if (isNamedError(error, 'FileSizeError')) {
    ctx.errorHandler.sendFileSizeError(0, file);
  } else {
    ErrorHandler.showError('プレビューの更新に失敗しました', error);
  }
}
