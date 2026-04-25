import * as vscode from 'vscode';
import { WebViewLifecycleManager } from './webview/webview-lifecycle-manager';
import { WebViewUpdateManager } from './webview/webview-update-manager';
import { WebViewMessageHandler } from './webview/webview-message-handler';
import type { YamlSchemaLoader } from './webview/yaml-parser';
import type { IThemeManager, IWebViewManager } from '../types';
import { PreviewController } from './preview/preview-controller';
import { VscodePreviewHost } from './preview/vscode-preview-host';
import { NodePreviewThemeFilePort } from './preview/node-preview-theme-file-port';

/**
 * WebViewManager（ファサード）
 * 各専用クラスに処理を委譲する
 */
export class WebViewManager implements IWebViewManager {
  updateManager: WebViewUpdateManager;
  messageHandler: WebViewMessageHandler;
  private _themeManager: IThemeManager | undefined;
  private controller: PreviewController;

  constructor(context: vscode.ExtensionContext, themeManager?: IThemeManager, schemaLoader?: YamlSchemaLoader) {
    const lifecycleManager = new WebViewLifecycleManager(context);
    this.updateManager = new WebViewUpdateManager(lifecycleManager, schemaLoader);
    this.messageHandler = new WebViewMessageHandler(
      context,
      lifecycleManager,
      this.updateManager,
      themeManager
    );
    const previewHost = new VscodePreviewHost(lifecycleManager);
    const themeFilePort = new NodePreviewThemeFilePort();
    this._themeManager = themeManager;
    this.controller = new PreviewController({
      previewHost,
      updateManager: this.updateManager,
      messageHandler: this.messageHandler,
      themeManager,
      themeFilePort
    });
  }

  get themeManager(): IThemeManager | undefined {
    return this._themeManager;
  }

  set themeManager(themeManager: IThemeManager | undefined) {
    this._themeManager = themeManager;
    this.messageHandler.themeManager = themeManager;
    this.controller.setThemeManager(themeManager);
  }

  async openPreview(): Promise<void> {
    await this.controller.openPreview();
  }

  async updatePreview(forceUpdate: boolean = false): Promise<void> {
    await this.controller.updatePreview(forceUpdate);
  }

  sendUpdatingSignal(): void {
    this.controller.sendUpdatingSignal();
  }

  closePreview(): void {
    this.controller.closePreview();
  }

  setLastTuiFile(filePath: string, updatePreview: boolean = false): void {
    this.controller.setLastTuiFile(filePath, updatePreview);
  }

  getLastTuiFile(): string | undefined {
    return this.controller.getLastTuiFile();
  }

  applyThemeVariables(css: string): void {
    this.controller.applyThemeVariables(css);
  }

  notifyThemeChange(theme: 'light' | 'dark'): void {
    this.controller.notifyThemeChange(theme);
  }

  notifyPreviewSettingsChanged(): void {
    this.controller.notifyPreviewSettingsChanged();
  }

  hasPanel(): boolean {
    return this.controller.hasPanel();
  }

  getPanel(): vscode.WebviewPanel | undefined {
    return this.controller.getPanel() as vscode.WebviewPanel | undefined;
  }

  dispose(): void {
    this.controller.dispose();
  }

  openDevTools(): void {
    this.controller.openDevTools();
  }

  async switchTheme(themePath: string): Promise<void> {
    return await this.controller.switchTheme(themePath);
  }

  async sendAvailableThemes(): Promise<void> {
    return await this.controller.sendAvailableThemes();
  }
}
