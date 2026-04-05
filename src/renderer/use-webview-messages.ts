import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { TextUIDSL } from '../domain/dsl-types';
import type { VisualDiffResult } from '../domain/diff/visual-diff-model';
import type { ConflictViewResult } from '../domain/diff/conflict-webview-model';
import type { OverlayDiffState } from '../domain/diff/overlay-diff-types';
import {
  formatSchemaErrors,
  mapDetailedSchemaError,
  mapParseError,
  mapSchemaValidationError,
  mapSimpleError
} from './error-mappers';
import type { ErrorInfo } from './error-guidance';
import type { PreviewUpdateStatus } from './preview-update-status';
import { createPreviewUpdateFeedbackController } from './preview-update-feedback-controller';

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
  onDiffUpdate?: (diff: VisualDiffResult) => void;
  onConflictUpdate?: (conflict: ConflictViewResult) => void;
  onHighlightComponent?: (index: number | null) => void;
  onOverlayDiffInit?: (state: OverlayDiffState) => void;
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
    setShowJumpToDslHoverIndicator,
    onDiffUpdate,
    onConflictUpdate,
    onHighlightComponent,
    onOverlayDiffInit
  } = options;
  const previewUpdateFeedbackRef = useRef<ReturnType<typeof createPreviewUpdateFeedbackController> | null>(null);

  useEffect(() => {
    postReady();
    previewUpdateFeedbackRef.current = createPreviewUpdateFeedbackController({
      setUpdateStatus,
      setLastCompletedAt
    });

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
          previewUpdateFeedbackRef.current?.handlePreviewComplete();
          setError(null);
          break;
        case 'update':
          applyDslUpdate(message.data as TextUIDSL);
          previewUpdateFeedbackRef.current?.handlePreviewComplete();
          setError(null);
          break;
        case 'preview-updating':
          previewUpdateFeedbackRef.current?.handlePreviewUpdating();
          break;
        case 'error':
          previewUpdateFeedbackRef.current?.handlePreviewAbort();
          setError(mapSimpleError(message));
          break;
        case 'schema-error': {
          const schemaErrors = formatSchemaErrors(message.errors);
          previewUpdateFeedbackRef.current?.handlePreviewAbort();
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
          previewUpdateFeedbackRef.current?.handlePreviewAbort();
          setError(mapParseError(message));
          break;
        case 'schemaError':
          previewUpdateFeedbackRef.current?.handlePreviewAbort();
          setError(mapDetailedSchemaError(message));
          break;
        case 'clearError':
          previewUpdateFeedbackRef.current?.handlePreviewAbort();
          setError(null);
          break;
        case 'diff-update':
          onDiffUpdate?.(message.diff as VisualDiffResult);
          break;
        case 'conflict-update':
          onConflictUpdate?.(message.conflict as ConflictViewResult);
          break;
        case 'highlight-component':
          onHighlightComponent?.(message.index as number | null);
          break;
        case 'overlay-diff-init':
          onOverlayDiffInit?.({
            dslA: message.dslA as import('../domain/dsl-types').TextUIDSL,
            fileNameA: message.fileNameA as string,
            dslB: message.dslB as import('../domain/dsl-types').TextUIDSL,
            fileNameB: message.fileNameB as string
          });
          break;
        default:
          if (isDevelopmentMode) {
            console.log('[React] unhandled message type', message.type);
          }
      }
    };

    window.addEventListener('message', onMessage);
    return () => {
      previewUpdateFeedbackRef.current?.dispose();
      previewUpdateFeedbackRef.current = null;
      window.removeEventListener('message', onMessage);
    };
  }, [postReady, applyDslUpdate, setError, setUpdateStatus, setLastCompletedAt, setShowUpdateIndicator, setShowJumpToDslHoverIndicator, onDiffUpdate, onConflictUpdate, onHighlightComponent, onOverlayDiffInit]);
}
