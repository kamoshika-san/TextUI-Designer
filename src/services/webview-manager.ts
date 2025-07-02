import * as vscode from 'vscode';
import { ThemeManager } from './theme-manager';
import { WebViewLifecycleManager } from './webview/webview-lifecycle-manager';
import { WebViewUpdateManager } from './webview/webview-update-manager';
import { WebViewMessageHandler } from './webview/webview-message-handler';
import { TextUIDSL } from '../renderer/types';

/**
 * WebViewManager（ファサード）
 * 各専用クラスに処理を委譲する
 */
export class WebViewManager {
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
   * テスト用メモリ管理
   */
  _testMemoryManagement(): void {
    this.updateManager._testMemoryManagement();
  }

  /**
   * テーマを切り替え（旧API互換）
   */
  async switchTheme(themePath: string): Promise<void> {
    // messageHandlerの内部メソッドを呼び出し
    // 本来privateだが、テスト互換のためpublic化
    // @ts-ignore
    return await this.messageHandler.switchTheme(themePath);
  }

  /**
   * テーマ一覧を送信（旧API互換）
   */
  async sendAvailableThemes(): Promise<void> {
    // @ts-ignore
    return await this.messageHandler.sendAvailableThemes();
  }

  /**
   * テスト用: YAMLキャッシュ内容を取得
   */
  _getYamlCacheContent(): string {
    // @ts-ignore
    return this.updateManager._getYamlCacheContent();
  }

  /**
   * テスト用: YAMLキャッシュをクリア
   */
  _clearYamlCache(): void {
    // @ts-ignore
    this.updateManager._clearYamlCache();
  }

  /**
   * テスト用: YAMLキャッシュ内容を設定
   */
  _setYamlCacheContent(content: string): void {
    // @ts-ignore
    this.updateManager._setYamlCacheContent(content);
  }

  /**
   * テスト用: YAMLキャッシュ内容を取得/設定
   */
  get lastYamlContent(): string {
    // @ts-ignore
    return this.updateManager._getYamlCacheContent();
  }
  set lastYamlContent(val: string) {
    // @ts-ignore
    this.updateManager.lastYamlContent = val;
  }

  get lastParsedData(): TextUIDSL | null {
    // @ts-ignore
    return this.updateManager.lastParsedData;
  }
  set lastParsedData(val: TextUIDSL | null) {
    // @ts-ignore
    this.updateManager.lastParsedData = val;
  }
} 