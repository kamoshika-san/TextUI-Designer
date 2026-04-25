import type { IThemeManager } from '../../types';
import type { PreviewHost } from './preview-host';
import type { PreviewMessagePort, PreviewUpdatePort } from './preview-ports';
import type { PreviewThemeFilePort } from './preview-theme-file-port';

export interface PreviewControllerDeps {
  previewHost: PreviewHost;
  updateManager: PreviewUpdatePort;
  messageHandler: PreviewMessagePort;
  themeManager?: IThemeManager;
  themeFilePort?: PreviewThemeFilePort;
}

/**
 * Host 非依存の Preview 更新オーケストレーション。
 */
export class PreviewController {
  constructor(private readonly deps: PreviewControllerDeps) {}

  async openPreview(): Promise<void> {
    await this.deps.previewHost.openPreview(() => this.deps.messageHandler.setupMessageHandler());
  }

  async updatePreview(forceUpdate: boolean = false): Promise<void> {
    await this.deps.updateManager.updatePreview(forceUpdate);
  }

  sendUpdatingSignal(): void {
    this.deps.messageHandler.sendUpdatingSignal();
  }

  closePreview(): void {
    this.deps.previewHost.closePreview();
  }

  setLastTuiFile(filePath: string, updatePreview: boolean = false): void {
    const previousFilePath = this.deps.updateManager.getLastTuiFile();
    this.deps.updateManager.setLastTuiFile(filePath, updatePreview);
    void this.syncThemeForDslFile(filePath, previousFilePath);
  }

  getLastTuiFile(): string | undefined {
    return this.deps.updateManager.getLastTuiFile();
  }

  applyThemeVariables(css: string): void {
    this.deps.messageHandler.applyThemeVariables(css);
  }

  notifyThemeChange(theme: 'light' | 'dark'): void {
    this.deps.messageHandler.notifyThemeChange(theme);
  }

  notifyPreviewSettingsChanged(): void {
    this.deps.messageHandler.sendPreviewSettings();
  }

  hasPanel(): boolean {
    return this.deps.previewHost.hasPanel();
  }

  getPanel() {
    return this.deps.previewHost.getPanel();
  }

  dispose(): void {
    this.deps.updateManager.dispose();
    this.deps.previewHost.dispose();
  }

  openDevTools(): void {
    this.deps.updateManager.openDevTools();
  }

  async switchTheme(themePath: string): Promise<void> {
    return await this.deps.messageHandler.switchTheme(themePath);
  }

  async sendAvailableThemes(): Promise<void> {
    return await this.deps.messageHandler.sendAvailableThemes();
  }

  setThemeManager(themeManager: IThemeManager | undefined): void {
    this.deps.themeManager = themeManager;
  }

  private async syncThemeForDslFile(filePath: string, previousFilePath?: string): Promise<void> {
    if (!this.deps.themeManager) {
      return;
    }

    if (!this.deps.themeFilePort) {
      return;
    }

    const nextFolder = this.deps.themeFilePort.getDirectoryPath(filePath);
    const previousFolder = previousFilePath
      ? this.deps.themeFilePort.getDirectoryPath(previousFilePath)
      : undefined;
    if (previousFolder === nextFolder) {
      return;
    }

    const resolvedThemePath = this.deps.themeFilePort.resolveThemePathForDirectory(nextFolder);
    this.deps.themeManager.setThemePath(resolvedThemePath);
    await this.deps.themeManager.loadTheme();
    this.applyThemeVariables(this.deps.themeManager.generateCSSVariables());
    await this.sendAvailableThemes();
  }
}
