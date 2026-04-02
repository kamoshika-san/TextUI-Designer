import { useEffect } from 'react';
import type { TextUIDSL } from '../domain/dsl-types';
import {
  formatSchemaErrors,
  mapDetailedSchemaError,
  mapParseError,
  mapSchemaValidationError,
  mapSimpleError
} from './error-mappers';
import type { ErrorInfo } from './error-guidance';
import { reducePreviewUpdateStatus, type PreviewUpdateStatus } from './preview-update-status';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isDevelopmentMode = Boolean(
  (typeof globalThis !== 'undefined' && (globalThis as { __TUI_DEV_MODE__?: boolean }).__TUI_DEV_MODE__) ||
  window.location.search.includes('textui-dev=true')
);

function applyThemeVariables(css: unknown): void {
  const t0 = isDevelopmentMode ? performance.now() : 0;
  const styleEl = document.getElementById('theme-vars');
  const getElementMs = isDevelopmentMode ? performance.now() - t0 : 0;

  if (!styleEl) {
    if (isDevelopmentMode) {
      console.error('[React] theme-vars element was not found');
    }
    return;
  }

  const t1 = isDevelopmentMode ? performance.now() : 0;
  styleEl.textContent = typeof css === 'string' ? css : '';
  const textContentMs = isDevelopmentMode ? performance.now() - t1 : 0;

  if (isDevelopmentMode) {
    console.debug('[React][theme-variables] applied', {
      getElementByIdMs: Number(getElementMs.toFixed(2)),
      textContentMs: Number(textContentMs.toFixed(2))
    });
  }
}

interface UseWebviewMessagesOptions {
  postReady: () => void;
  applyDslUpdate: (dsl: TextUIDSL) => void;
  setError: (value: ErrorInfo | string | null) => void;
  setUpdateStatus: (updater: (current: PreviewUpdateStatus) => PreviewUpdateStatus) => void;
  setShowJumpToDslHoverIndicator: (value: boolean) => void;
}

export function useWebviewMessages(options: UseWebviewMessagesOptions): void {
  const { postReady, applyDslUpdate, setError, setUpdateStatus, setShowJumpToDslHoverIndicator } = options;

  useEffect(() => {
    postReady();

    const onMessage = (event: MessageEvent<unknown>) => {
      const message = event.data;
      if (!isRecord(message) || typeof message.type !== 'string') {
        return;
      }
      if (isDevelopmentMode) {
        console.log('[React] message received:', message);
      }

      switch (message.type) {
        case 'json':
          applyDslUpdate(message.json as TextUIDSL);
          setUpdateStatus(current => reducePreviewUpdateStatus(current, 'preview-update-complete'));
          setError(null);
          break;
        case 'update':
          applyDslUpdate(message.data as TextUIDSL);
          setUpdateStatus(current => reducePreviewUpdateStatus(current, 'preview-update-complete'));
          setError(null);
          break;
        case 'preview-updating':
          setUpdateStatus(current => reducePreviewUpdateStatus(current, 'preview-updating'));
          break;
        case 'error':
          setUpdateStatus(current => reducePreviewUpdateStatus(current, 'preview-update-error'));
          setError(mapSimpleError(message));
          break;
        case 'schema-error': {
          const schemaErrors = formatSchemaErrors(message.errors);
          setUpdateStatus(current => reducePreviewUpdateStatus(current, 'preview-update-error'));
          setError(mapSchemaValidationError(message, schemaErrors));
          break;
        }
        case 'theme-change':
          break;
        case 'theme-variables':
          applyThemeVariables(message.css);
          break;
        case 'preview-settings':
          setShowJumpToDslHoverIndicator(
            Boolean(
              isRecord(message.settings) &&
              isRecord(message.settings.jumpToDsl) &&
              message.settings.jumpToDsl.showHoverIndicator
            )
          );
          break;
        case 'parseError':
          setUpdateStatus(current => reducePreviewUpdateStatus(current, 'preview-update-error'));
          setError(mapParseError(message));
          break;
        case 'schemaError':
          setUpdateStatus(current => reducePreviewUpdateStatus(current, 'preview-update-error'));
          setError(mapDetailedSchemaError(message));
          break;
        case 'clearError':
          setUpdateStatus(current => reducePreviewUpdateStatus(current, 'clear-error'));
          setError(null);
          break;
        default:
          if (isDevelopmentMode) {
            console.log('[React] unhandled message type', message.type);
          }
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [postReady, applyDslUpdate, setError, setUpdateStatus, setShowJumpToDslHoverIndicator]);
}
