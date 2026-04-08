import type { WebViewLifecycleManager } from './webview-lifecycle-manager';

export class WebViewPanelMessenger {
  constructor(private readonly lifecycleManager: WebViewLifecycleManager) {}

  postThemeVariables(css: string): void {
    this.postMessage({
      type: 'theme-variables',
      css
    });
  }

  postThemeChange(theme: 'light' | 'dark'): void {
    this.postMessage({
      type: 'theme-change',
      theme
    });
  }

  postPreviewUpdating(): void {
    this.postMessage({
      type: 'preview-updating'
    });
  }

  postPreviewSettings(settings: {
    preview: { showUpdateIndicator: boolean };
    jumpToDsl: { showHoverIndicator: boolean };
  }): void {
    this.postMessage({
      type: 'preview-settings',
      settings
    });
  }

  postAvailableThemes(themes: unknown[]): void {
    this.postMessage({
      type: 'available-themes',
      themes
    });
  }

  private postMessage(message: unknown): void {
    const panel = this.lifecycleManager.getPanel();
    if (!panel) {
      return;
    }

    void panel.webview.postMessage(message);
  }
}
