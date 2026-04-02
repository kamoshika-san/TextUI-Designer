import type { Dispatch, SetStateAction } from 'react';
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

type TimeoutHandle = ReturnType<typeof setTimeout>;

interface PreviewUpdateFeedbackControllerOptions {
  setUpdateStatus: Dispatch<SetStateAction<PreviewUpdateStatus>>;
  setLastCompletedAt: (value: number | null) => void;
  now?: () => number;
  schedule?: (callback: () => void, delayMs: number) => TimeoutHandle;
  clearScheduled?: (handle: TimeoutHandle) => void;
}

export interface PreviewUpdateFeedbackController {
  handlePreviewUpdating: () => void;
  handlePreviewComplete: () => void;
  handlePreviewAbort: () => void;
  dispose: () => void;
}

export function createPreviewUpdateFeedbackController(
  options: PreviewUpdateFeedbackControllerOptions
): PreviewUpdateFeedbackController {
  const {
    setUpdateStatus,
    setLastCompletedAt,
    now = () => Date.now(),
    schedule = (callback, delayMs) => setTimeout(callback, delayMs),
    clearScheduled = (handle) => clearTimeout(handle)
  } = options;

  let gateState: PreviewUpdateIndicatorGateState = INITIAL_PREVIEW_UPDATE_INDICATOR_GATE_STATE;
  let pendingTimeout: TimeoutHandle | null = null;

  const clearPendingIndicator = () => {
    if (pendingTimeout !== null) {
      clearScheduled(pendingTimeout);
      pendingTimeout = null;
    }
  };

  return {
    handlePreviewUpdating() {
      clearPendingIndicator();
      gateState = beginPreviewUpdateIndicatorGate();
      setLastCompletedAt(null);
      pendingTimeout = schedule(() => {
        const next = revealPreviewUpdateIndicator();
        gateState = next.gate;
        pendingTimeout = null;
        setUpdateStatus(next.status);
      }, PREVIEW_UPDATE_INDICATOR_THRESHOLD_MS);
    },

    handlePreviewComplete() {
      clearPendingIndicator();
      const next = completePreviewUpdateIndicatorGate(gateState);
      gateState = next.gate;
      setLastCompletedAt(now());
      setUpdateStatus(next.status);
    },

    handlePreviewAbort() {
      clearPendingIndicator();
      const next = abortPreviewUpdateIndicatorGate();
      gateState = next.gate;
      setLastCompletedAt(null);
      setUpdateStatus(next.status);
    },

    dispose() {
      clearPendingIndicator();
    }
  };
}
