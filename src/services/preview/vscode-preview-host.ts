import type { WebviewPanelLike } from '../../types';
import { WebViewLifecycleManager } from '../webview/webview-lifecycle-manager';
import type { PreviewHost } from './preview-host';

/**
 * VS Code 固有の Preview Host 実装。
 */
export class VscodePreviewHost implements PreviewHost {
  constructor(private readonly lifecycleManager: WebViewLifecycleManager) {}

  async openPreview(setupMessageHandler: () => void): Promise<void> {
    if (this.lifecycleManager.hasPanel()) {
      this.lifecycleManager.revealPanel();
      return;
    }

    await this.lifecycleManager.createPreviewPanel();
    setupMessageHandler();
  }

  closePreview(): void {
    this.lifecycleManager.closePanel();
  }

  hasPanel(): boolean {
    return this.lifecycleManager.hasPanel();
  }

  getPanel(): WebviewPanelLike | undefined {
    return this.lifecycleManager.getPanel();
  }

  dispose(): void {
    this.lifecycleManager.dispose();
  }
}
