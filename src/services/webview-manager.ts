import * as vscode from 'vscode';
import { WebViewLifecycleManager } from './webview/webview-lifecycle-manager';
import { WebViewUpdateManager } from './webview/webview-update-manager';
import { WebViewMessageHandler } from './webview/webview-message-handler';
import type { YamlSchemaLoader } from './webview/yaml-parser';
import type { IThemeManager, IWebViewManager } from '../types';

/**
 * WebViewManager（ファサード）
 * 各専用クラスに処理を委譲する
 */
export class WebViewManager implements IWebViewManager {
  private lifecycleManager: WebViewLifecycleManager;
  private updateManager: WebViewUpdateManager;
  private messageHandler: WebViewMessageHandler;
  private themeManager: IThemeManager | undefined;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext, themeManager?: IThemeManager, schemaLoader?: YamlSchemaLoader) {
    this.context = context;
    this.themeManager = themeManager;
    this.lifecycleManager = new WebViewLifecycleManager(context);
    this.updateManager = new WebViewUpdateManager(this.lifecycleManager, schemaLoader);
    this.messageHandler = new WebViewMessageHandler(
      context,
      this.lifecycleManager,
      this.updateManager,
      themeManager
    );
  }

  async openPreview(): Promise<void> {
    if (this.lifecycleManager.hasPanel()) {
      this.lifecycleManager.revealPanel();
    } else {
      await this.lifecycleManager.createPreviewPanel();
      this.messageHandler.setupMessageHandler();
    }
  }

  async updatePreview(forceUpdate: boolean = false): Promise<void> {
    await this.updateManager.updatePreview(forceUpdate);
  }

  closePreview(): void {
    this.lifecycleManager.closePanel();
  }

  setLastTuiFile(filePath: string, updatePreview: boolean = false): void {
    this.updateManager.setLastTuiFile(filePath, updatePreview);
  }

  getLastTuiFile(): string | undefined {
    return this.updateManager.getLastTuiFile();
  }

  applyThemeVariables(css: string): void {
    this.messageHandler.applyThemeVariables(css);
  }

  notifyThemeChange(theme: 'light' | 'dark'): void {
    this.messageHandler.notifyThemeChange(theme);
  }

  hasPanel(): boolean {
    return this.lifecycleManager.hasPanel();
  }

  getPanel(): vscode.WebviewPanel | undefined {
    return this.lifecycleManager.getPanel();
  }

  dispose(): void {
    this.updateManager.dispose();
    this.lifecycleManager.dispose();
  }

  openDevTools(): void {
    this.updateManager.openDevTools();
  }

  async switchTheme(themePath: string): Promise<void> {
    return await this.messageHandler.switchTheme(themePath);
  }

  async sendAvailableThemes(): Promise<void> {
    return await this.messageHandler.sendAvailableThemes();
  }
}
