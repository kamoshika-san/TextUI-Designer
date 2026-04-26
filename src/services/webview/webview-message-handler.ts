import * as path from 'path';
import * as fs from 'fs/promises';
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
import { YamlIncludeResolver } from './yaml-include-resolver';

type MessageType = 'export' | 'export-preview' | 'jump-to-dsl' | 'show-jump-to-dsl-help' | 'webview-ready' | 'theme-switch' | 'get-themes' | 'navigate-back' | 'back-to-flow' | 'preview-navigate' | 'request-semantic-diff-v2' | 'cancel-semantic-diff-v2';
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
      'export': async (message) => this.handleExportMessage(message),
      'export-preview': async (message) => this.handleExportPreviewMessage(message),
      'jump-to-dsl': async (message) => this.handleJumpToDslMessage(message),
      'show-jump-to-dsl-help': async () => this.handleShowJumpToDslHelpMessage(),
      'navigate-back': async (message) => this.handleNavigateBack(message),
      'webview-ready': async () => this.handleWebViewReady(),
      'theme-switch': async (message) => this.handleThemeSwitchMessage(message),
      'get-themes': async () => this.handleGetThemes(),
      'back-to-flow': async () => this.handleBackToFlow(),
      'preview-navigate': async (message) => this.handlePreviewNavigate(message),
      'request-semantic-diff-v2': async () => this.handleRequestSemanticDiffV2(),
      'cancel-semantic-diff-v2': async () => this.handleCancelSemanticDiffV2()
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
      let editor = await vscode.window.showTextDocument(document, vscode.ViewColumn.One);

      // Send return path immediately after the file opens, before position resolution,
      // so the Back button appears even if cursor positioning fails or races with file-watcher DSL updates
      if (returnPath) {
        this.panelMessenger.postSetReturnPath(returnPath);
      }

      let position = this.yamlPointerResolver.resolvePosition(document, dslPath);
      let resolvedDocument = document;
      let resolvedDslPath = dslPath;
      const includeJumpCandidate = await this.resolveIncludeJumpTarget(targetFile, dslPath);
      const shouldPreferInclude = Boolean(
        includeJumpCandidate
        && (includeJumpCandidate.targetFilePath !== targetFile || includeJumpCandidate.dslPath !== dslPath)
      );

      if (shouldPreferInclude && includeJumpCandidate) {
        resolvedDocument = await vscode.workspace.openTextDocument(includeJumpCandidate.targetFilePath);
        editor = await vscode.window.showTextDocument(resolvedDocument, vscode.ViewColumn.One);
        resolvedDslPath = includeJumpCandidate.dslPath;
        position = this.yamlPointerResolver.resolvePosition(resolvedDocument, resolvedDslPath);
      }

      if (!position) {
        // Container 配下などの入れ子 include を追従するため、複数ホップで include 解決を試みる。
        for (let hop = 0; hop < 5 && !position; hop++) {
          const includeJump = await this.resolveIncludeJumpTarget(resolvedDocument.fileName, resolvedDslPath);
          if (!includeJump) {
            break;
          }
          if (includeJump.targetFilePath === resolvedDocument.fileName && includeJump.dslPath === resolvedDslPath) {
            break;
          }
          resolvedDocument = await vscode.workspace.openTextDocument(includeJump.targetFilePath);
          editor = await vscode.window.showTextDocument(resolvedDocument, vscode.ViewColumn.One);
          resolvedDslPath = includeJump.dslPath;
          position = this.yamlPointerResolver.resolvePosition(resolvedDocument, resolvedDslPath);
        }
      }

      if (!position) {
        this.windowAdapter.showWarningMessage(`DSLパスを解決できませんでした: ${dslPath}`);
        return;
      }

      this.applyEditorSelection(editor, position);
      this.logger.debug(`${componentName} を DSL にジャンプ: ${resolvedDslPath}`);
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

  private async handleShowJumpToDslHelpMessage(): Promise<void> {
    await vscode.commands.executeCommand('textui-designer.showJumpToDslHelp');
  }

  /**
   * Wave 3: WebView の「意味」タブが選択された通知。
   * Extension は v2 計算→送信を許可し、キャッシュ済みがあれば即時再送する。
   */
  private async handleRequestSemanticDiffV2(): Promise<void> {
    this.logger.debug('request-semantic-diff-v2 を受信');
    this.updateManager.setSemanticV2Subscription(true);
  }

  /**
   * Wave 3: WebView の「構造」タブが選択された通知。
   * Extension は v2 自動配信を停止する（キャッシュは維持）。
   */
  private async handleCancelSemanticDiffV2(): Promise<void> {
    this.logger.debug('cancel-semantic-diff-v2 を受信');
    this.updateManager.setSemanticV2Subscription(false);
  }

  private isMessageType(type: string): type is MessageType {
    return type in this.messageHandlers;
  }

  /**
   * エクスポートメッセージを処理
   */
  private async handleExportMessage(message: WebViewMessage): Promise<void> {
    this.logger.debug('エクスポートメッセージを受信');
    const targetFile = await this.resolveExportTargetPath(message);

    if (targetFile) {
      this.logger.debug(`エクスポート用ファイル: ${targetFile}`);
      await vscode.commands.executeCommand('textui-designer.export', targetFile);
    } else {
      this.logger.debug('エクスポート用ファイルが見つかりません');
      this.windowAdapter.showWarningMessage('.tui.yml ファイルのプレビューを開いてからエクスポートしてください。');
    }
  }

  /**
   * エクスポートプレビューメッセージを処理
   */
  private async handleExportPreviewMessage(message: WebViewMessage): Promise<void> {
    this.logger.debug('エクスポートプレビューメッセージを受信');
    const targetFile = await this.resolveExportTargetPath(message);

    if (!targetFile) {
      this.windowAdapter.showWarningMessage('.tui.yml ファイルのプレビューを開いてからエクスポートしてください。');
      return;
    }

    await vscode.commands.executeCommand('textui-designer.export-preview', targetFile);
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
      const targetUri = vscode.Uri.file(targetFilePath);
      await vscode.window.showTextDocument(targetUri, { preserveFocus: true, preview: false });
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

  private async resolveExportTargetPath(message: WebViewMessage): Promise<string | undefined> {
    const requestedSourcePath = this.readRequestedSourcePath(message);
    const resolvedRequested = await this.validateExportSourcePath(requestedSourcePath);
    if (resolvedRequested) {
      return resolvedRequested;
    }

    const lastTuiFile = this.updateManager.getLastTuiFile();
    return lastTuiFile ? path.normalize(lastTuiFile) : undefined;
  }

  private readRequestedSourcePath(message: WebViewMessage): string | undefined {
    if (typeof message.sourcePath !== 'string') {
      return undefined;
    }
    const normalized = message.sourcePath.trim();
    return normalized ? normalized : undefined;
  }

  private async validateExportSourcePath(sourcePath: string | undefined): Promise<string | undefined> {
    if (!sourcePath || !ConfigManager.isSupportedFile(sourcePath)) {
      return undefined;
    }

    const normalizedPath = path.normalize(path.resolve(sourcePath));
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(normalizedPath));
      return normalizedPath;
    } catch {
      this.logger.warn(`export sourcePath is unavailable, falling back: ${normalizedPath}`);
      return undefined;
    }
  }

  private resolveJumpTargetFile(requestedTargetFilePath?: string): string | undefined {
    const resolvedPath = resolveNavigationJumpTargetFile({
      requestedTargetFilePath,
      activeEditorFile: vscode.window.activeTextEditor?.document.fileName,
      lastPreviewFile: this.updateManager.getLastTuiFile()
    });

    return resolvedPath ? path.normalize(resolvedPath) : undefined;
  }

  private async resolveIncludeJumpTarget(
    baseFilePath: string,
    dslPath: string
  ): Promise<{ targetFilePath: string; dslPath: string } | undefined> {
    const match = dslPath.match(/^\/page\/components\/(\d+)(\/.*)?$/);
    if (!match) {
      return undefined;
    }

    const targetIndex = Number(match[1]);
    const suffix = match[2] ?? '';
    if (!Number.isInteger(targetIndex) || targetIndex < 0) {
      return undefined;
    }

    try {
      const baseContent = await fs.readFile(baseFilePath, 'utf-8');
      const baseYaml = await parseYamlTextAsync(baseContent);
      const topLevelEntries = this.extractSourceTopLevelEntries(baseYaml);
      if (topLevelEntries.length === 0) {
        return undefined;
      }

      const includeResolver = new YamlIncludeResolver((content) => parseYamlTextAsync(content));
      let expandedOffset = 0;

      for (const entry of topLevelEntries) {
        if (!this.isIncludeDirective(entry.node)) {
          if (expandedOffset === targetIndex) {
            const nested = await this.resolveNestedIncludeFromNode(baseFilePath, entry.node, suffix);
            if (nested) {
              return nested;
            }
            return {
              targetFilePath: baseFilePath,
              dslPath: this.mergeRootAndSuffix(entry.path, suffix)
            };
          }
          expandedOffset += 1;
          continue;
        }

        const includePath = path.resolve(path.dirname(baseFilePath), entry.node.$include.template);
        const includeContent = await fs.readFile(includePath, 'utf-8');
        const includeYaml = await parseYamlTextAsync(includeContent);
        const resolved = await includeResolver.resolve(includeYaml, includePath);
        const includeComponents = this.extractTopLevelComponents(resolved);
        const span = includeComponents.length;
        if (span === 0) {
          continue;
        }

        if (targetIndex >= expandedOffset && targetIndex < expandedOffset + span) {
          const localIndex = targetIndex - expandedOffset;
          const transitive = await this.resolveTransitiveIncludeTarget(includePath, localIndex, suffix);
          if (transitive) {
            return transitive;
          }
          const mappedPath = this.buildIncludeMappedPath({
            resolvedInclude: resolved,
            includeComponents,
            localIndex,
            suffix
          });
          return {
            targetFilePath: includePath,
            dslPath: mappedPath
          };
        }
        expandedOffset += span;
      }
    } catch (error) {
      this.logger.debug('include jump target resolution skipped:', error);
    }
    return undefined;
  }

  private async resolveNestedIncludeFromNode(
    currentFilePath: string,
    componentNode: unknown,
    suffix: string
  ): Promise<{ targetFilePath: string; dslPath: string } | undefined> {
    if (!this.isRecord(componentNode)) {
      return undefined;
    }

    // Handle /Tabs/items/$n/components/$m — expand $includes within tab item components
    const tabsMatch = suffix.match(/^\/Tabs\/items\/(\d+)\/components\/(\d+)(\/.*)?$/);
    if (tabsMatch) {
      const tabsBody = componentNode['Tabs'];
      if (!this.isRecord(tabsBody) || !Array.isArray(tabsBody.items)) {
        return undefined;
      }
      const itemIndex = Number(tabsMatch[1]);
      const compIndex = Number(tabsMatch[2]);
      const rest = tabsMatch[3] ?? '';
      const tabItem = tabsBody.items[itemIndex];
      if (!this.isRecord(tabItem) || !Array.isArray(tabItem.components)) {
        return undefined;
      }
      const includeResolver = new YamlIncludeResolver((content) => parseYamlTextAsync(content));
      let expandedOffset = 0;
      for (const comp of tabItem.components) {
        if (!this.isIncludeDirective(comp)) {
          if (expandedOffset === compIndex) {
            return undefined;
          }
          expandedOffset += 1;
          continue;
        }
        const includePath = path.resolve(path.dirname(currentFilePath), comp.$include.template);
        const includeContent = await fs.readFile(includePath, 'utf-8');
        const includeYaml = await parseYamlTextAsync(includeContent);
        const resolved = await includeResolver.resolve(includeYaml, includePath);
        const includeComponents = this.extractTopLevelComponents(resolved);
        const span = includeComponents.length;
        if (span === 0) {
          continue;
        }
        if (compIndex >= expandedOffset && compIndex < expandedOffset + span) {
          const localIndex = compIndex - expandedOffset;
          const nestedPath = `/page/components/${localIndex}${rest}`;
          const transitive = await this.resolveIncludeJumpTarget(includePath, nestedPath);
          return transitive ?? { targetFilePath: includePath, dslPath: nestedPath };
        }
        expandedOffset += span;
      }
      return undefined;
    }

    const match = suffix.match(/^\/([^/]+)\/components\/(\d+)(\/.*)?$/);
    if (!match) {
      return undefined;
    }

    const componentKind = match[1];
    const targetIndex = Number(match[2]);
    const rest = match[3] ?? '';
    const body = componentNode[componentKind];
    if (!this.isRecord(body) || !Array.isArray(body.components) || !Number.isInteger(targetIndex) || targetIndex < 0) {
      return undefined;
    }

    const includeResolver = new YamlIncludeResolver((content) => parseYamlTextAsync(content));
    let expandedOffset = 0;
    for (const item of body.components) {
      if (!this.isIncludeDirective(item)) {
        if (expandedOffset === targetIndex) {
          if (rest) {
            return this.resolveNestedIncludeFromNode(currentFilePath, item, rest);
          }
          return undefined;
        }
        expandedOffset += 1;
        continue;
      }

      const includePath = path.resolve(path.dirname(currentFilePath), item.$include.template);
      const includeContent = await fs.readFile(includePath, 'utf-8');
      const includeYaml = await parseYamlTextAsync(includeContent);
      const resolved = await includeResolver.resolve(includeYaml, includePath);
      const includeComponents = this.extractTopLevelComponents(resolved);
      const span = includeComponents.length;
      if (span === 0) {
        continue;
      }
      if (targetIndex >= expandedOffset && targetIndex < expandedOffset + span) {
        const localIndex = targetIndex - expandedOffset;
        const nestedPath = `/page/components/${localIndex}${rest}`;
        const transitive = await this.resolveIncludeJumpTarget(includePath, nestedPath);
        return transitive ?? { targetFilePath: includePath, dslPath: nestedPath };
      }
      expandedOffset += span;
    }
    return undefined;
  }

  private extractTopLevelComponents(value: unknown): unknown[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (!this.isRecord(value)) {
      return [];
    }
    const page = this.isRecord(value.page) ? value.page : undefined;
    const components = page?.components;
    if (Array.isArray(components)) {
      return components;
    }
    // Some include templates are authored as a single component object
    // (e.g. `{ Container: { ... } }`) rather than a full `page.components` document.
    // Treat that case as a single expanded component.
    if (Object.keys(value).length === 1) {
      return [value];
    }
    return [];
  }

  private async resolveTransitiveIncludeTarget(
    filePath: string,
    targetIndex: number,
    suffix: string
  ): Promise<{ targetFilePath: string; dslPath: string } | undefined> {
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const parsed = await parseYamlTextAsync(raw);
      const topLevelEntries = this.extractSourceTopLevelEntries(parsed);
      if (topLevelEntries.length === 0) {
        return undefined;
      }

      const includeResolver = new YamlIncludeResolver((content) => parseYamlTextAsync(content));
      let expandedOffset = 0;

      for (const entry of topLevelEntries) {
        if (!this.isIncludeDirective(entry.node)) {
          if (expandedOffset === targetIndex) {
            if (suffix) {
              const nested = await this.resolveNestedIncludeFromNode(filePath, entry.node, suffix);
              if (nested) {
                return nested;
              }
            }
            return {
              targetFilePath: filePath,
              dslPath: this.mergeRootAndSuffix(entry.path, suffix)
            };
          }
          expandedOffset += 1;
          continue;
        }

        const includePath = path.resolve(path.dirname(filePath), entry.node.$include.template);
        const includeContent = await fs.readFile(includePath, 'utf-8');
        const includeYaml = await parseYamlTextAsync(includeContent);
        const resolved = await includeResolver.resolve(includeYaml, includePath);
        const includeComponents = this.extractTopLevelComponents(resolved);
        const span = includeComponents.length;
        if (span === 0) {
          continue;
        }

        if (targetIndex >= expandedOffset && targetIndex < expandedOffset + span) {
          return this.resolveTransitiveIncludeTarget(includePath, targetIndex - expandedOffset, suffix);
        }
        expandedOffset += span;
      }
    } catch (error) {
      this.logger.debug('transitive include resolution skipped:', error);
    }
    return undefined;
  }

  private extractSourceTopLevelEntries(value: unknown): Array<{ node: unknown; path: string }> {
    if (Array.isArray(value)) {
      return value.map((node, index) => ({ node, path: `/${index}` }));
    }
    if (!this.isRecord(value)) {
      return [];
    }
    const page = this.isRecord(value.page) ? value.page : undefined;
    const components = page?.components;
    if (Array.isArray(components)) {
      return components.map((node, index) => ({ node, path: `/page/components/${index}` }));
    }
    if (Object.keys(value).length === 1) {
      return [{ node: value, path: `/${Object.keys(value)[0]}` }];
    }
    return [];
  }

  private mergeRootAndSuffix(rootPath: string, suffix: string): string {
    if (!suffix) {
      return rootPath;
    }
    if (suffix.startsWith(rootPath)) {
      return suffix;
    }
    return `${rootPath}${suffix}`;
  }

  private buildIncludeMappedPath(params: {
    resolvedInclude: unknown;
    includeComponents: unknown[];
    localIndex: number;
    suffix: string;
  }): string {
    const { resolvedInclude, includeComponents, localIndex, suffix } = params;

    if (this.hasPageComponents(resolvedInclude)) {
      return `/page/components/${localIndex}${suffix}`;
    }

    const selected = includeComponents[localIndex];
    const componentKind = this.extractSingleComponentKind(selected);
    if (!componentKind) {
      return `/page/components/${localIndex}${suffix}`;
    }
    if (!suffix) {
      return `/${componentKind}`;
    }
    if (suffix.startsWith(`/${componentKind}`)) {
      return suffix;
    }
    return `/${componentKind}${suffix}`;
  }

  private hasPageComponents(value: unknown): boolean {
    if (!this.isRecord(value)) {
      return false;
    }
    const page = this.isRecord(value.page) ? value.page : undefined;
    return Array.isArray(page?.components);
  }

  private extractSingleComponentKind(value: unknown): string | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }
    const keys = Object.keys(value);
    return keys.length === 1 ? keys[0] : undefined;
  }

  private isIncludeDirective(value: unknown): value is { $include: { template: string } } {
    return this.isRecord(value)
      && this.isRecord(value.$include)
      && typeof value.$include.template === 'string';
  }

  private isRecord(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null;
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
