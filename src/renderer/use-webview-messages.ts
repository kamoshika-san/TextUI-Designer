import { useEffect } from 'react';
import type { TextUIDSL } from './types';
import {
  formatSchemaErrors,
  mapDetailedSchemaError,
  mapParseError,
  mapSchemaValidationError,
  mapSimpleError
} from './error-mappers';
import type { ErrorInfo } from './error-guidance';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isDevelopmentMode = Boolean(
  (typeof globalThis !== 'undefined' && (globalThis as { __TUI_DEV_MODE__?: boolean }).__TUI_DEV_MODE__) ||
  window.location.search.includes('textui-dev=true')
);

function applyThemeVariables(css: unknown): void {
  // 計測: getElementById / textContent の所要時間（T-20260317-006）
  const t0 = isDevelopmentMode ? performance.now() : 0;
  const styleEl = document.getElementById('theme-vars');
  const getElementMs = isDevelopmentMode ? performance.now() - t0 : 0;

  if (!styleEl) {
    if (isDevelopmentMode) {
      console.error('[React] theme-vars要素が見つかりません');
    }
    return;
  }

  const t1 = isDevelopmentMode ? performance.now() : 0;
  styleEl.textContent = typeof css === 'string' ? css : '';
  const textContentMs = isDevelopmentMode ? performance.now() - t1 : 0;

  if (isDevelopmentMode) {
    console.debug('[React][theme-variables] 適用しました', {
      getElementByIdMs: Number(getElementMs.toFixed(2)),
      textContentMs: Number(textContentMs.toFixed(2))
    });
  }
}

interface UseWebviewMessagesOptions {
  postReady: () => void;
  applyDslUpdate: (dsl: TextUIDSL) => void;
  setError: (value: ErrorInfo | string | null) => void;
}

export function useWebviewMessages(options: UseWebviewMessagesOptions): void {
  const { postReady, applyDslUpdate, setError } = options;

  useEffect(() => {
    postReady();

    const onMessage = (event: MessageEvent<unknown>) => {
      const message = event.data;
      if (!isRecord(message) || typeof message.type !== 'string') {
        return;
      }
      if (isDevelopmentMode) {
        console.log('[React] メッセージを受信:', message);
      }

      switch (message.type) {
        case 'json':
          if (isDevelopmentMode) {
            console.log('[React] JSONデータを受信:', message.json);
          }
          applyDslUpdate(message.json as TextUIDSL);
          setError(null);
          break;
        case 'update':
          if (isDevelopmentMode) {
            console.log('[React] 更新データを受信:', message.data);
          }
          applyDslUpdate(message.data as TextUIDSL);
          setError(null);
          break;
        case 'error':
          if (isDevelopmentMode) {
            console.log('[React] エラーメッセージを受信:', message.error);
          }
          setError(mapSimpleError(message));
          break;
        case 'schema-error': {
          if (isDevelopmentMode) {
            console.log('[React] スキーマエラーメッセージを受信:', message.errors);
          }
          const schemaErrors = formatSchemaErrors(message.errors);
          setError(mapSchemaValidationError(message, schemaErrors));
          break;
        }
        case 'theme-change':
          if (isDevelopmentMode) {
            console.log('[React] テーマ変更メッセージを受信:', message.theme);
          }
          break;
        case 'theme-variables':
          applyThemeVariables(message.css);
          break;
        case 'parseError':
          if (isDevelopmentMode) {
            console.log('[React] 詳細パースエラーメッセージを受信:', message.error);
          }
          setError(mapParseError(message));
          break;
        case 'schemaError':
          if (isDevelopmentMode) {
            console.log('[React] 詳細スキーマエラーメッセージを受信:', message.error);
          }
          setError(mapDetailedSchemaError(message));
          break;
        case 'clearError':
          if (isDevelopmentMode) {
            console.log('[React] エラー状態クリアメッセージを受信');
          }
          setError(null);
          break;
        default:
          if (isDevelopmentMode) {
            console.log('[React] 未対応のメッセージタイプ:', message.type);
          }
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [postReady, applyDslUpdate, setError]);
}
