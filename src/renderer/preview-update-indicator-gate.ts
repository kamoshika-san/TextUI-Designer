import type { PreviewUpdateStatus } from './preview-update-status';

export const PREVIEW_UPDATE_INDICATOR_THRESHOLD_MS = 150;

export interface PreviewUpdateIndicatorGateState {
  hasPendingIndicator: boolean;
  hasShownIndicator: boolean;
}

export const INITIAL_PREVIEW_UPDATE_INDICATOR_GATE_STATE: PreviewUpdateIndicatorGateState = {
  hasPendingIndicator: false,
  hasShownIndicator: false
};

export function beginPreviewUpdateIndicatorGate(): PreviewUpdateIndicatorGateState {
  return {
    hasPendingIndicator: true,
    hasShownIndicator: false
  };
}

export function revealPreviewUpdateIndicator(): {
  gate: PreviewUpdateIndicatorGateState;
  status: PreviewUpdateStatus;
} {
  return {
    gate: {
      hasPendingIndicator: false,
      hasShownIndicator: true
    },
    status: 'updating'
  };
}

export function completePreviewUpdateIndicatorGate(
  gate: PreviewUpdateIndicatorGateState
): {
  gate: PreviewUpdateIndicatorGateState;
  status: PreviewUpdateStatus;
} {
  if (gate.hasPendingIndicator) {
    return {
      gate: INITIAL_PREVIEW_UPDATE_INDICATOR_GATE_STATE,
      status: 'idle'
    };
  }

  return {
    gate: INITIAL_PREVIEW_UPDATE_INDICATOR_GATE_STATE,
    status: gate.hasShownIndicator ? 'done' : 'idle'
  };
}

export function abortPreviewUpdateIndicatorGate(): {
  gate: PreviewUpdateIndicatorGateState;
  status: PreviewUpdateStatus;
} {
  return {
    gate: INITIAL_PREVIEW_UPDATE_INDICATOR_GATE_STATE,
    status: 'idle'
  };
}
