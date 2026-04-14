import * as path from 'path';
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
import { WebViewPanelMessenger } from './webview-panel-messenger';
import { resolveNavigationJumpTargetFile } from '../commands/navigation-jump-command';
import { isNavigationFlowDSL } from '../../domain/dsl-types';
import { parseYamlTextAsync } from '../../dsl/yaml-parse-async';

type MessageType = 'export' | 'export-preview' | 'jump-to-dsl' | 'webview-ready' | 'theme-switch' | 'get-themes' | 'navigate-back' | 'back-to-flow' | 'preview-navigate';
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
  private readonly panelMessenger: WebViewPanelMessenger;
  private readonly messageHandlers: Record<MessageType, MessageHandler>;
  private readonly logger = new Logger('WebViewMessageHandler');
  private lastFlowFilePath: string | undefined;

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
    this.panelMessenger = new WebViewPanelMessenger(this.lifecycleManager);
    this.messageHandlers = {
      'export': async () => this.handleExportMessage(),
      'export-preview': async () => this.handleExportPreviewMessage(),
      'jump-to-dsl': async (message) => this.handleJumpToDslMessage(message),
      'navigate-back': async (message) => this.handleNavigateBack(message),
      'webview-ready': async () => this.handleWebViewReady(),
      'theme-switch': async (message) => this.handleThemeSwitchMessage(message),
      'get-themes': async () => this.handleGetThemes(),
      'back-to-flow': async () => this.handleBackToFlow(),
      'preview-navigate': async (message) => this.handlePreviewNavigate(message)
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

    // フローファイルが保存されたとき lastFlowFilePath キャッシュを更新する（E-NI-S12）
    this.context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(async (document) => {
        await this.cacheFlowFilePath(document.uri.fsPath);
      })
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
    const targetFilePath = typeof message.targetFilePath === 'string' ? message.targetFilePath : undefined;

    if (!dslPath) {
      console.warn('[WebViewMessageHandler] jump-to-dsl に dslPath がありません');
      return;
    }

    // Capture current preview file before opening the new document.
    // When the WebView owns focus, activeTextEditor can be undefined, so fall back to the last previewed TUI file.
    const returnPath = targetFilePath ? this.resolveActiveTuiPath() : undefined;

    const targetFile = this.resolveJumpTargetFile(targetFilePath);
    if (!targetFile) {
      this.windowAdapter.showWarningMessage('ジャンプ先のDSLファイルが見つかりません。対応する .tui.yml / .tui.flow.yml を開いてください。');
      return;
    }

    try {
      const document = await vscode.workspace.openTextDocument(targetFile);
      const editor = await vscode.window.showTextDocument(document, vscode.ViewColumn.One);

      // Send return path immediately after the file opens, before position resolution,
      // so the Back button appears even if cursor positioning fails or races with file-watcher DSL updates
      if (returnPath) {
        this.panelMessenger.postSetReturnPath(returnPath);
      }

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

  private async handleNavigateBack(message: Record<string, unknown>): Promise<void> {
    const returnPath = typeof message.returnPath === 'string' ? message.returnPath : '';
    if (!returnPath) {
      this.logger.warn('[WebViewMessageHandler] navigate-back に returnPath がありません');
      return;
    }

    try {
      const document = await vscode.workspace.openTextDocument(returnPath);
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      this.logger.debug(`navigate-back: ${returnPath}`);
    } catch (error) {
      this.logger.error('navigate-back エラー:', error);
      this.windowAdapter.showErrorMessage(`ナビゲーションに失敗しました: ${error}`);
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
   * エクスポートプレビューメッセージを処理
   */
  private async handleExportPreviewMessage(): Promise<void> {
    this.logger.debug('エクスポートプレビューメッセージを受信');
    const lastTuiFile = this.updateManager.getLastTuiFile();

    if (!lastTuiFile) {
      this.windowAdapter.showWarningMessage('プレビューするファイルが見つかりません。先に.tui.ymlファイルを開いてください。');
      return;
    }

    await vscode.commands.executeCommand('textui-designer.export-preview', lastTuiFile);
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
    await this.cacheFlowFilePath();
  }

  /**
   * フローファイルパスをキャッシュする（E-NI-S11/S12）
   * 指定 filePath が NavigationFlowDSL であれば lastFlowFilePath を更新する。
   * filePath 省略時は getLastTuiFile() を使用（webview-ready 時のデフォルト動作）。
   */
  private async cacheFlowFilePath(filePath?: string): Promise<void> {
    const pathToCheck = filePath ?? this.updateManager.getLastTuiFile();
    if (!pathToCheck) { return; }
    try {
      const rawBytes = await vscode.workspace.fs.readFile(vscode.Uri.file(pathToCheck));
      const parsed = await parseYamlTextAsync(Buffer.from(rawBytes).toString('utf-8'));
      if (isNavigationFlowDSL(parsed)) {
        this.lastFlowFilePath = pathToCheck;
        this.logger.debug(`cacheFlowFilePath: lastFlowFilePath = ${pathToCheck}`);
      }
    } catch {
      // キャッシュ失敗は無視（preview-navigate が warn を出す）
    }
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

  /**
   * back-to-flow メッセージを処理（E-NI-S6）
   * FlowPreviewPanel を前面に出す
   */
  private async handleBackToFlow(): Promise<void> {
    this.logger.debug('back-to-flow メッセージを受信');
    try {
      await vscode.commands.executeCommand('textui-designer.openFlowPreview');
    } catch {
      // コマンドが存在しない場合は静かに無視
      this.logger.debug('back-to-flow: openFlowPreview コマンドが見つかりません');
    }
  }

  /**
   * preview-navigate メッセージを処理（E-NI-S11）
   * trigger から遷移先画面ファイルを解決して webview に送信する
   */
  private async handlePreviewNavigate(message: Record<string, unknown>): Promise<void> {
    const trigger = typeof message.trigger === 'string' ? message.trigger : '';
    if (!trigger) {
      this.logger.warn('preview-navigate: trigger がありません');
      return;
    }

    const flowFilePath = this.lastFlowFilePath;
    if (!flowFilePath) {
      this.logger.warn('preview-navigate: フローファイルが見つかりません（webview-ready 前か非フローファイル）');
      return;
    }

    try {
      const rawBytes = await vscode.workspace.fs.readFile(vscode.Uri.file(flowFilePath));
      const parsed = await parseYamlTextAsync(Buffer.from(rawBytes).toString('utf-8'));

      if (!isNavigationFlowDSL(parsed)) {
        this.logger.warn('preview-navigate: 現在のファイルはフロー DSL ではありません');
        return;
      }

      const matched = parsed.flow.transitions.find(t => t.trigger === trigger);
      if (!matched) {
        this.logger.warn(`preview-navigate: trigger="${trigger}" に一致する遷移が見つかりません`);
        return;
      }

      const screen = parsed.flow.screens.find(s => s.id === matched.to);
      if (!screen?.page) {
        this.logger.warn(`preview-navigate: screen "${matched.to}" のページファイルが未定義です`);
        return;
      }

      const targetFilePath = path.resolve(path.dirname(flowFilePath), screen.page);
      this.logger.debug(`preview-navigate: trigger="${trigger}" → ${targetFilePath}`);
      this.updateManager.setLastTuiFile(targetFilePath, true);
    } catch (error) {
      this.logger.warn(`preview-navigate エラー: ${error}`);
    }
  }

  applyThemeVariables(css: string): void {
    this.panelMessenger.postThemeVariables(css);
  }

  notifyThemeChange(theme: 'light' | 'dark'): void {
    this.panelMessenger.postThemeChange(theme);
  }

  sendUpdatingSignal(): void {
    this.panelMessenger.postPreviewUpdating();
  }

  sendPreviewSettings(): void {
    const webviewSettings = ConfigManager.getWebViewSettings();
    this.panelMessenger.postPreviewSettings({
      preview: {
        showUpdateIndicator: Boolean(webviewSettings.preview?.showUpdateIndicator)
      },
      jumpToDsl: {
        showHoverIndicator: Boolean(webviewSettings.jumpToDsl?.showHoverIndicator)
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
      this.panelMessenger.postAvailableThemes(themes);
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

  private resolveJumpTargetFile(requestedTargetFilePath?: string): string | undefined {
    const resolvedPath = resolveNavigationJumpTargetFile({
      requestedTargetFilePath,
      activeEditorFile: vscode.window.activeTextEditor?.document.fileName,
      lastPreviewFile: this.updateManager.getLastTuiFile()
    });

    return resolvedPath ? path.normalize(resolvedPath) : undefined;
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
