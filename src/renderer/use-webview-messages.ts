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
  (typeof window !== 'undefined' && window.location.search.includes('textui-dev=true'))
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
  setLastCompletedAt: (value: number | null) => void;
  setShowUpdateIndicator: (value: boolean) => void;
  setShowJumpToDslHoverIndicator: (value: boolean) => void;
}

export function readPreviewSettings(
  settings: unknown
): { showUpdateIndicator: boolean; showJumpToDslHoverIndicator: boolean } {
  const settingsRecord = isRecord(settings) ? settings : null;
  const previewSettings = settingsRecord && isRecord(settingsRecord.preview) ? settingsRecord.preview : null;
  const jumpToDslSettings = settingsRecord && isRecord(settingsRecord.jumpToDsl) ? settingsRecord.jumpToDsl : null;

  return {
    showUpdateIndicator: previewSettings?.showUpdateIndicator !== false,
    showJumpToDslHoverIndicator: Boolean(jumpToDslSettings?.showHoverIndicator)
  };
}

export function useWebviewMessages(options: UseWebviewMessagesOptions): void {
  const {
    postReady,
    applyDslUpdate,
    setError,
    setUpdateStatus,
    setLastCompletedAt,
    setShowUpdateIndicator,
    setShowJumpToDslHoverIndicator
  } = options;

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
          setLastCompletedAt(Date.now());
          setUpdateStatus(current => reducePreviewUpdateStatus(current, 'preview-update-complete'));
          setError(null);
          break;
        case 'update':
          applyDslUpdate(message.data as TextUIDSL);
          setLastCompletedAt(Date.now());
          setUpdateStatus(current => reducePreviewUpdateStatus(current, 'preview-update-complete'));
          setError(null);
          break;
        case 'preview-updating':
          setLastCompletedAt(null);
          setUpdateStatus(current => reducePreviewUpdateStatus(current, 'preview-updating'));
          break;
        case 'error':
          setLastCompletedAt(null);
          setUpdateStatus(current => reducePreviewUpdateStatus(current, 'preview-update-error'));
          setError(mapSimpleError(message));
          break;
        case 'schema-error': {
          const schemaErrors = formatSchemaErrors(message.errors);
          setLastCompletedAt(null);
          setUpdateStatus(current => reducePreviewUpdateStatus(current, 'preview-update-error'));
          setError(mapSchemaValidationError(message, schemaErrors));
          break;
        }
        case 'theme-change':
          break;
        case 'theme-variables':
          applyThemeVariables(message.css);
          break;
        case 'preview-settings': {
          const previewSettings = readPreviewSettings(message.settings);
          setShowUpdateIndicator(previewSettings.showUpdateIndicator);
          setShowJumpToDslHoverIndicator(previewSettings.showJumpToDslHoverIndicator);
          break;
        }
        case 'parseError':
          setLastCompletedAt(null);
          setUpdateStatus(current => reducePreviewUpdateStatus(current, 'preview-update-error'));
          setError(mapParseError(message));
          break;
        case 'schemaError':
          setLastCompletedAt(null);
          setUpdateStatus(current => reducePreviewUpdateStatus(current, 'preview-update-error'));
          setError(mapDetailedSchemaError(message));
          break;
        case 'clearError':
          setLastCompletedAt(null);
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
  }, [postReady, applyDslUpdate, setError, setUpdateStatus, setLastCompletedAt, setShowUpdateIndicator, setShowJumpToDslHoverIndicator]);
}
