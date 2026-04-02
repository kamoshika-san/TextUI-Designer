import React from 'react';
import type { PreviewUpdateStatus } from '../preview-update-status';
import { formatRelativeUpdateTimestamp } from '../update-indicator-utils';

interface UpdateIndicatorProps {
  status: PreviewUpdateStatus;
  lastCompletedAt?: number | null;
  showRelativeTimestamp?: boolean;
  now?: number;
}

export const UpdateIndicator: React.FC<UpdateIndicatorProps> = ({
  status,
  lastCompletedAt = null,
  showRelativeTimestamp = false,
  now
}) => {
  if (status === 'idle') {
    return null;
  }

  const isUpdating = status === 'updating';
  const isDone = status === 'done';
  const relativeTimestamp = isDone && showRelativeTimestamp && typeof lastCompletedAt === 'number'
    ? formatRelativeUpdateTimestamp(Math.max(0, (now ?? Date.now()) - lastCompletedAt))
    : null;

  return (
    <div
      aria-live="polite"
      role="status"
      className={`textui-update-indicator ${isUpdating ? 'is-updating' : 'is-done'}`}
    >
      {isUpdating ? (
        <span
          aria-hidden="true"
          className="textui-update-indicator-icon textui-update-indicator-spinner"
        />
      ) : (
        <span
          aria-hidden="true"
          className="textui-update-indicator-icon textui-update-indicator-check"
        >
          ✓
        </span>
      )}
      <span className="textui-update-indicator-label">
        {isUpdating ? 'Preview updating...' : 'Updated'}
      </span>
      {relativeTimestamp ? (
        <span className="textui-update-indicator-timestamp">
          {relativeTimestamp}
        </span>
      ) : null}
    </div>
  );
};
