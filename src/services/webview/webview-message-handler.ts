import * as vscode from 'vscode';
import { WebViewLifecycleManager } from './webview-lifecycle-manager';
import { WebViewUpdateManager } from './webview-update-manager';
import { isWebViewMessage, type IThemeManager, type WebViewMessage } from '../../types';
import { ConfigManager } from '../../utils/config-manager';
import { Logger } from '../../utils/logger';
import { ThemeDiscoveryService } from './theme-discovery-service';
import { ThemeSwitchService } from './theme-switch-service';
import { VSCodeWindowAdapter } from './vscode-window-adapter';
import { YamlPointerResolver } from './yaml-pointer-resolver';
import { withPreviewPipelineTrace } from './preview-pipeline-observability';

type MessageType = 'export' | 'jump-to-dsl' | 'webview-ready' | 'theme-switch' | 'get-themes';
type MessageHandler = (message: WebViewMessage) => Promise<void>;

interface WebViewMessageHandlerDependencies {
  themeSwitchService?: ThemeSwitchService;
  windowAdapter?: VSCodeWindowAdapter;
}

/**
 * WebViewとのメッセージ通信を担当
 * メッセージの受信・送信・ルーティングを一元化
 */
export class WebViewMessageHandler {
  private lifecycleManager: WebViewLifecycleManager;
  private updateManager: WebViewUpdateManager;
  themeManager: IThemeManager | undefined;
  private context: vscode.ExtensionContext;
  private readonly themeDiscoveryService: ThemeDiscoveryService;
  private readonly yamlPointerResolver: YamlPointerResolver;
  private readonly themeSwitchService: ThemeSwitchService;
  private readonly windowAdapter: VSCodeWindowAdapter;
  private readonly messageHandlers: Record<MessageType, MessageHandler>;
  private readonly logger = new Logger('WebViewMessageHandler');

  constructor(
    context: vscode.ExtensionContext,
    lifecycleManager: WebViewLifecycleManager,
    updateManager: WebViewUpdateManager,
    themeManager?: IThemeManager,
    dependencies: WebViewMessageHandlerDependencies = {}
  ) {
    this.context = context;
    this.lifecycleManager = lifecycleManager;
    this.updateManager = updateManager;
    this.themeManager = themeManager;
    this.themeDiscoveryService = new ThemeDiscoveryService(() => this.updateManager.getLastTuiFile());
    this.yamlPointerResolver = new YamlPointerResolver();
    this.themeSwitchService = dependencies.themeSwitchService ?? new ThemeSwitchService();
    this.windowAdapter = dependencies.windowAdapter ?? new VSCodeWindowAdapter();
    this.messageHandlers = {
      'export': async () => this.handleExportMessage(),
      'jump-to-dsl': async (message) => this.handleJumpToDslMessage(message),
      'webview-ready': async () => this.handleWebViewReady(),
      'theme-switch': async (message) => this.handleThemeSwitchMessage(message),
      'get-themes': async () => this.handleGetThemes()
    };
  }

  /**
   * メッセージハンドラーを設定
   */
  setupMessageHandler(): void {
    const panel = this.lifecycleManager.getPanel();
    if (!panel) {
      return;
    }

    panel.webview.onDidReceiveMessage(
      async (message) => {
        await this.handleMessage(message);
      },
      undefined,
      this.context.subscriptions
    );
  }

  /**
   * メッセージを処理
   */
  private async handleMessage(message: unknown): Promise<void> {
    if (!isWebViewMessage(message)) {
      console.warn('[WebViewMessageHandler] 無効なメッセージを受信しました');
      return;
    }

    if (!this.isMessageType(message.type)) {
      this.logger.warn('未知のメッセージタイプ:', message.type);
      return;
    }

    await this.messageHandlers[message.type](message);
  }

  private async handleJumpToDslMessage(message: Record<string, unknown>): Promise<void> {
    const dslPath = typeof message.dslPath === 'string' ? message.dslPath : '';
    const componentName = typeof message.componentName === 'string' ? message.componentName : 'component';

    if (!dslPath) {
      console.warn('[WebViewMessageHandler] jump-to-dsl に dslPath がありません');
      return;
    }

    const targetFile = this.resolveActiveTuiPath();
    if (!targetFile) {
      this.windowAdapter.showWarningMessage('ジャンプ先のDSLファイルが見つかりません。*.tui.yml を開いてください。');
      return;
    }

    try {
      const document = await vscode.workspace.openTextDocument(targetFile);
      const editor = await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      const position = this.yamlPointerResolver.resolvePosition(document, dslPath);

      if (!position) {
        this.windowAdapter.showWarningMessage(`DSLパスを解決できませんでした: ${dslPath}`);
        return;
      }

      this.applyEditorSelection(editor, position);
      this.logger.debug(`${componentName} を DSL にジャンプ: ${dslPath}`);
    } catch (error) {
      this.logger.error('jump-to-dsl エラー:', error);
      this.windowAdapter.showErrorMessage(`DSLジャンプに失敗しました: ${error}`);
    }
  }

  private isMessageType(type: string): type is MessageType {
    return type in this.messageHandlers;
  }

  /**
   * エクスポートメッセージを処理
   */
  private async handleExportMessage(): Promise<void> {
    this.logger.debug('エクスポートメッセージを受信');
    const lastTuiFile = this.updateManager.getLastTuiFile();

    if (lastTuiFile) {
      this.logger.debug(`エクスポート用ファイル: ${lastTuiFile}`);
      await vscode.commands.executeCommand('textui-designer.export', lastTuiFile);
    } else {
      this.logger.debug('エクスポート用ファイルが見つかりません');
      this.windowAdapter.showWarningMessage('エクスポートするファイルが見つかりません。先に.tui.ymlファイルを開いてください。');
    }
  }

  /**
   * WebView準備完了メッセージを処理
   */
  private async handleWebViewReady(): Promise<void> {
    this.logger.debug('WebView準備完了メッセージを受信');

    const colorThemeKind = vscode.window.activeColorTheme?.kind;
    const lightThemeKind = vscode.ColorThemeKind?.Light;
    const initialTheme = colorThemeKind === lightThemeKind ? 'light' : 'dark';
    this.notifyThemeChange(initialTheme);
    this.sendPreviewSettings();

    await withPreviewPipelineTrace(
      {
        entry: 'webview_ready',
        scheduledFile: this.updateManager.getLastTuiFile()
      },
      () => this.updateManager.sendYamlToWebview(true)
    );

    if (this.themeManager) {
      this.applyThemeVariables(this.themeManager.generateCSSVariables());
      // テーマファイル監視はプレビューが初めて開いたタイミングで開始（activate クリティカルパス短縮・T-305）
      this.themeManager.watchThemeFile(css => {
        this.applyThemeVariables(css);
      });
    }

    await this.sendAvailableThemes();
    await this.returnFocusToEditor();
  }

  private async handleThemeSwitchMessage(message: WebViewMessage): Promise<void> {
    if (typeof message.themePath !== 'string') {
      this.logger.warn('theme-switch の themePath が無効です');
      return;
    }

    await this.handleThemeSwitch(message.themePath);
  }

  /**
   * テーマ切り替えメッセージを処理
   */
  private async handleThemeSwitch(themePath: string): Promise<void> {
    this.logger.debug('テーマ切り替えメッセージを受信:', themePath);
    await this.switchTheme(themePath);
  }

  /**
   * テーマ一覧取得メッセージを処理
   */
  private async handleGetThemes(): Promise<void> {
    this.logger.debug('テーマ一覧リクエストを受信');
    await this.sendAvailableThemes();
  }

  applyThemeVariables(css: string): void {
    const panel = this.lifecycleManager.getPanel();
    if (!panel) {
      return;
    }

    panel.webview.postMessage({
      type: 'theme-variables',
      css
    });
  }

  notifyThemeChange(theme: 'light' | 'dark'): void {
    const panel = this.lifecycleManager.getPanel();
    if (!panel) {
      return;
    }

    panel.webview.postMessage({
      type: 'theme-change',
      theme: theme
    });
  }

  sendUpdatingSignal(): void {
    const panel = this.lifecycleManager.getPanel();
    if (!panel) {
      return;
    }

    panel.webview.postMessage({
      type: 'preview-updating'
    });
  }

  sendPreviewSettings(): void {
    const panel = this.lifecycleManager.getPanel();
    if (!panel) {
      return;
    }

    const webviewSettings = ConfigManager.getWebViewSettings();
    panel.webview.postMessage({
      type: 'preview-settings',
      settings: {
        preview: {
          showUpdateIndicator: Boolean(webviewSettings.preview?.showUpdateIndicator)
        },
        jumpToDsl: {
          showHoverIndicator: Boolean(webviewSettings.jumpToDsl?.showHoverIndicator)
        }
      }
    });
  }

  async sendAvailableThemes(): Promise<void> {
    const panel = this.lifecycleManager.getPanel();
    if (!panel || !panel.webview) {
      return;
    }

    try {
      const themes = await this.themeDiscoveryService.detectAvailableThemes(this.themeManager);
      panel.webview.postMessage({
        type: 'available-themes',
        themes: themes
      });
    } catch (error) {
      this.logger.error('テーマ一覧取得エラー:', error);
    }
  }

  private resolveActiveTuiPath(): string | undefined {
    const activeEditorFile = vscode.window.activeTextEditor?.document.fileName;
    if (activeEditorFile && ConfigManager.isSupportedFile(activeEditorFile)) {
      return activeEditorFile;
    }

    const lastTuiFile = this.updateManager.getLastTuiFile();
    if (lastTuiFile && ConfigManager.isSupportedFile(lastTuiFile)) {
      return lastTuiFile;
    }

    return undefined;
  }

  /**
   * テーマを切り替え
   */
  async switchTheme(themePath: string): Promise<void> {
    if (!this.themeManager) {
      this.logger.debug('ThemeManagerが初期化されていません');
      return;
    }

    try {
      const result = await this.themeSwitchService.switchTheme({
        themeManager: this.themeManager,
        themePath,
        workspaceFolders: vscode.workspace.workspaceFolders
      });

      this.applyThemeVariables(result.cssVariables);
      await this.sendAvailableThemes();
      // プレビューは CSS 変数でテーマを反映するため、通常は DSL 再送不要（T-306 / css-only fast path）
      this.logger.debug(
        'theme_switch: css-only fast path（sendYamlToWebview スキップ）。DSL 再評価が必要な例外は将来ここで分岐可能'
      );

      if (result.notice.kind === 'info') {
        this.windowAdapter.showInformationMessage(result.notice.message);
        return;
      }

      this.windowAdapter.showErrorMessage(result.notice.message);
    } catch (error) {
      this.logger.error('テーマ切り替えエラー:', error);
      this.windowAdapter.showErrorMessage(`テーマ切り替えに失敗しました: ${error}`);
    }
  }

  private applyEditorSelection(editor: vscode.TextEditor, position: vscode.Position): void {
    const selection = typeof (vscode as { Selection?: unknown }).Selection === 'function'
      ? new vscode.Selection(position, position)
      : ({
          anchor: position,
          active: position,
          start: position,
          end: position
        } as unknown as vscode.Selection);
    editor.selection = selection;

    if (typeof editor.revealRange === 'function' && typeof (vscode as { Range?: unknown }).Range === 'function') {
      editor.revealRange(
        new vscode.Range(position, position),
        vscode.TextEditorRevealType.InCenter
      );
    }
  }

  /**
   * エディタにフォーカスを戻す
   */
  private async returnFocusToEditor(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    const shouldReturnFocus = Boolean(
      activeEditor && ConfigManager.isSupportedFile(activeEditor.document.fileName)
    );

    if (shouldReturnFocus && activeEditor) {
      setTimeout(async () => {
        try {
          await vscode.window.showTextDocument(activeEditor.document, vscode.ViewColumn.One);
          this.logger.debug('WebView初期化完了後にtui.ymlファイルにフォーカスを戻しました');
        } catch (error) {
          this.logger.debug('フォーカスを戻すことができませんでした:', error);
        }
      }, 300);
    }
  }
}
