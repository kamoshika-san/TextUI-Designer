export type PreviewUpdateStatus = 'idle' | 'updating' | 'done';

export type PreviewUpdateEvent =
  | 'preview-updating'
  | 'preview-update-complete'
  | 'preview-update-error'
  | 'clear-error';

export function reducePreviewUpdateStatus(
  _current: PreviewUpdateStatus,
  event: PreviewUpdateEvent
): PreviewUpdateStatus {
  switch (event) {
    case 'preview-updating':
      return 'updating';
    case 'preview-update-complete':
      return 'done';
    case 'preview-update-error':
    case 'clear-error':
      return 'idle';
    default:
      return _current;
  }
}
