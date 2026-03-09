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

function applyThemeVariables(css: unknown): void {
  console.log('[React] theme-variablesメッセージを受信:', css);
  const styleEl = document.getElementById('theme-vars');
  if (!styleEl) {
    console.error('[React] theme-vars要素が見つかりません');
    return;
  }
  console.log('[React] theme-vars要素が見つかりました。CSSを適用します');
  styleEl.textContent = typeof css === 'string' ? css : '';
  console.log('[React] CSS変数を適用しました');
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
      console.log('[React] メッセージを受信:', message);

      switch (message.type) {
        case 'json':
          console.log('[React] JSONデータを受信:', message.json);
          applyDslUpdate(message.json as TextUIDSL);
          setError(null);
          break;
        case 'update':
          console.log('[React] 更新データを受信:', message.data);
          applyDslUpdate(message.data as TextUIDSL);
          setError(null);
          break;
        case 'error':
          console.log('[React] エラーメッセージを受信:', message.error);
          setError(mapSimpleError(message));
          break;
        case 'schema-error': {
          console.log('[React] スキーマエラーメッセージを受信:', message.errors);
          const schemaErrors = formatSchemaErrors(message.errors);
          setError(mapSchemaValidationError(message, schemaErrors));
          break;
        }
        case 'theme-change':
          console.log('[React] テーマ変更メッセージを受信:', message.theme);
          break;
        case 'theme-variables':
          applyThemeVariables(message.css);
          break;
        case 'parseError':
          console.log('[React] 詳細パースエラーメッセージを受信:', message.error);
          setError(mapParseError(message));
          break;
        case 'schemaError':
          console.log('[React] 詳細スキーマエラーメッセージを受信:', message.error);
          setError(mapDetailedSchemaError(message));
          break;
        case 'clearError':
          console.log('[React] エラー状態クリアメッセージを受信');
          setError(null);
          break;
        default:
          console.log('[React] 未対応のメッセージタイプ:', message.type);
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [postReady, applyDslUpdate, setError]);
}
