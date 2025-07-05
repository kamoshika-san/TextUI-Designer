import * as vscode from 'vscode';
import { ThemeManager } from './theme-manager';
import { WebViewLifecycleManager } from './webview/webview-lifecycle-manager';
import { WebViewUpdateManager } from './webview/webview-update-manager';
import { WebViewMessageHandler } from './webview/webview-message-handler';
import { TextUIDSL } from '../renderer/types';
import { IWebViewManagerTest, IWebViewManagerLegacy } from '../types';

/**
 * WebViewManager（ファサード）
 * 各専用クラスに処理を委譲する
 */
export class WebViewManager implements IWebViewManagerTest, IWebViewManagerLegacy {
  private lifecycleManager: WebViewLifecycleManager;
  private updateManager: WebViewUpdateManager;
  private messageHandler: WebViewMessageHandler;
  private themeManager: ThemeManager | undefined;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext, themeManager?: ThemeManager) {
    this.context = context;
    this.themeManager = themeManager;
    this.lifecycleManager = new WebViewLifecycleManager(context);
    this.updateManager = new WebViewUpdateManager(this.lifecycleManager);
    this.messageHandler = new WebViewMessageHandler(
      context,
      this.lifecycleManager,
      this.updateManager,
      themeManager
    );
  }

  /**
   * プレビューを開く
   */
  async openPreview(): Promise<void> {
    if (this.lifecycleManager.hasPanel()) {
      this.lifecycleManager.revealPanel();
    } else {
      await this.lifecycleManager.createPreviewPanel();
      this.messageHandler.setupMessageHandler();
    }
  }

  /**
   * プレビューを更新
   */
  async updatePreview(forceUpdate: boolean = false): Promise<void> {
    await this.updateManager.updatePreview(forceUpdate);
  }

  /**
   * プレビューパネルを閉じる
   */
  closePreview(): void {
    this.lifecycleManager.closePanel();
  }

  /**
   * 最後に開いたtuiファイルを設定
   */
  setLastTuiFile(filePath: string, updatePreview: boolean = false): void {
    this.updateManager.setLastTuiFile(filePath, updatePreview);
  }

  /**
   * 最後に開いていたtuiファイルのパスを取得
   */
  getLastTuiFile(): string | undefined {
    return this.updateManager.getLastTuiFile();
  }

  /**
   * テーマ用CSS変数をWebViewへ送信
   */
  applyThemeVariables(css: string): void {
    this.messageHandler.applyThemeVariables(css);
  }

  /**
   * テーマ変更をWebViewに通知
   */
  notifyThemeChange(theme: 'light' | 'dark'): void {
    this.messageHandler.notifyThemeChange(theme);
  }

  /**
   * パネルが存在するか
   */
  hasPanel(): boolean {
    return this.lifecycleManager.hasPanel();
  }

  /**
   * パネルを取得
   */
  getPanel(): vscode.WebviewPanel | undefined {
    return this.lifecycleManager.getPanel();
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    this.lifecycleManager.dispose();
  }

  /**
   * 開発者ツールを開く
   */
  openDevTools(): void {
    this.updateManager.openDevTools();
  }

  /**
   * テスト用メモリ管理（IWebViewManagerTestインターフェース実装）
   */
  _testMemoryManagement(): void {
    this.updateManager._testMemoryManagement();
  }

  /**
   * テーマを切り替え（IWebViewManagerLegacyインターフェース実装）
   */
  async switchTheme(themePath: string): Promise<void> {
    return await this.messageHandler.switchTheme(themePath);
  }

  /**
   * テーマ一覧を送信（IWebViewManagerLegacyインターフェース実装）
   */
  async sendAvailableThemes(): Promise<void> {
    return await this.messageHandler.sendAvailableThemes();
  }

  /**
   * テスト用: YAMLキャッシュ内容を取得（IWebViewManagerTestインターフェース実装）
   */
  _getYamlCacheContent(): string {
    return this.updateManager._getYamlCacheContent();
  }

  /**
   * テスト用: YAMLキャッシュをクリア（IWebViewManagerTestインターフェース実装）
   */
  _clearYamlCache(): void {
    this.updateManager._clearYamlCache();
  }

  /**
   * テスト用: YAMLキャッシュ内容を設定（IWebViewManagerTestインターフェース実装）
   */
  _setYamlCacheContent(content: string): void {
    this.updateManager._setYamlCacheContent(content);
  }

  /**
   * テスト用: YAMLキャッシュ内容を取得/設定（IWebViewManagerTestインターフェース実装）
   */
  get lastYamlContent(): string {
    return this.updateManager.lastYamlContent;
  }
  
  set lastYamlContent(val: string) {
    this.updateManager.lastYamlContent = val;
  }

  get lastParsedData(): TextUIDSL | null {
    return this.updateManager.lastParsedData;
  }
  
  set lastParsedData(val: TextUIDSL | null) {
    this.updateManager.lastParsedData = val;
  }
} 