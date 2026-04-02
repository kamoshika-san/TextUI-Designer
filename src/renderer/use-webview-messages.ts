import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { TextUIDSL } from '../domain/dsl-types';
import {
  formatSchemaErrors,
  mapDetailedSchemaError,
  mapParseError,
  mapSchemaValidationError,
  mapSimpleError
} from './error-mappers';
import type { ErrorInfo } from './error-guidance';
import type { PreviewUpdateStatus } from './preview-update-status';
import {
  abortPreviewUpdateIndicatorGate,
  beginPreviewUpdateIndicatorGate,
  completePreviewUpdateIndicatorGate,
  INITIAL_PREVIEW_UPDATE_INDICATOR_GATE_STATE,
  PREVIEW_UPDATE_INDICATOR_THRESHOLD_MS,
  revealPreviewUpdateIndicator,
  type PreviewUpdateIndicatorGateState
} from './preview-update-indicator-gate';

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
  setUpdateStatus: Dispatch<SetStateAction<PreviewUpdateStatus>>;
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
  const updateIndicatorGateRef = useRef<PreviewUpdateIndicatorGateState>(INITIAL_PREVIEW_UPDATE_INDICATOR_GATE_STATE);
  const updateIndicatorTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    postReady();

    const clearPendingUpdateIndicator = () => {
      if (updateIndicatorTimeoutRef.current !== null) {
        window.clearTimeout(updateIndicatorTimeoutRef.current);
        updateIndicatorTimeoutRef.current = null;
      }
    };

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
          clearPendingUpdateIndicator();
          {
            const next = completePreviewUpdateIndicatorGate(updateIndicatorGateRef.current);
            updateIndicatorGateRef.current = next.gate;
          setLastCompletedAt(Date.now());
            setUpdateStatus(next.status);
          }
          setError(null);
          break;
        case 'update':
          applyDslUpdate(message.data as TextUIDSL);
          clearPendingUpdateIndicator();
          {
            const next = completePreviewUpdateIndicatorGate(updateIndicatorGateRef.current);
            updateIndicatorGateRef.current = next.gate;
          setLastCompletedAt(Date.now());
            setUpdateStatus(next.status);
          }
          setError(null);
          break;
        case 'preview-updating':
          clearPendingUpdateIndicator();
          updateIndicatorGateRef.current = beginPreviewUpdateIndicatorGate();
          setLastCompletedAt(null);
          updateIndicatorTimeoutRef.current = window.setTimeout(() => {
            const next = revealPreviewUpdateIndicator();
            updateIndicatorGateRef.current = next.gate;
            updateIndicatorTimeoutRef.current = null;
            setUpdateStatus(next.status);
          }, PREVIEW_UPDATE_INDICATOR_THRESHOLD_MS);
          break;
        case 'error':
          clearPendingUpdateIndicator();
          {
            const next = abortPreviewUpdateIndicatorGate();
            updateIndicatorGateRef.current = next.gate;
          setLastCompletedAt(null);
            setUpdateStatus(next.status);
          }
          setError(mapSimpleError(message));
          break;
        case 'schema-error': {
          const schemaErrors = formatSchemaErrors(message.errors);
          clearPendingUpdateIndicator();
          const next = abortPreviewUpdateIndicatorGate();
          updateIndicatorGateRef.current = next.gate;
          setLastCompletedAt(null);
          setUpdateStatus(next.status);
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
          clearPendingUpdateIndicator();
          {
            const next = abortPreviewUpdateIndicatorGate();
            updateIndicatorGateRef.current = next.gate;
          setLastCompletedAt(null);
            setUpdateStatus(next.status);
          }
          setError(mapParseError(message));
          break;
        case 'schemaError':
          clearPendingUpdateIndicator();
          {
            const next = abortPreviewUpdateIndicatorGate();
            updateIndicatorGateRef.current = next.gate;
          setLastCompletedAt(null);
            setUpdateStatus(next.status);
          }
          setError(mapDetailedSchemaError(message));
          break;
        case 'clearError':
          clearPendingUpdateIndicator();
          {
            const next = abortPreviewUpdateIndicatorGate();
            updateIndicatorGateRef.current = next.gate;
          setLastCompletedAt(null);
            setUpdateStatus(next.status);
          }
          setError(null);
          break;
        default:
          if (isDevelopmentMode) {
            console.log('[React] unhandled message type', message.type);
          }
      }
    };

    window.addEventListener('message', onMessage);
    return () => {
      clearPendingUpdateIndicator();
      window.removeEventListener('message', onMessage);
    };
  }, [postReady, applyDslUpdate, setError, setUpdateStatus, setLastCompletedAt, setShowUpdateIndicator, setShowJumpToDslHoverIndicator]);
}
