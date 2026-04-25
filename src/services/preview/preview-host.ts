import type { WebviewPanelLike } from '../../types';

export interface PreviewHost {
  openPreview(setupMessageHandler: () => void): Promise<void>;
  closePreview(): void;
  hasPanel(): boolean;
  getPanel(): WebviewPanelLike | undefined;
  dispose(): void;
}
