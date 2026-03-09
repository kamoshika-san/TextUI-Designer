import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { WebViewLifecycleManager } from './webview-lifecycle-manager';
import { WebViewUpdateManager } from './webview-update-manager';
import { isWebViewMessage, type IThemeManager } from '../../types';
import { ConfigManager } from '../../utils/config-manager';
import { ThemeDiscoveryService } from './theme-discovery-service';
import { YamlPointerResolver } from './yaml-pointer-resolver';

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

  constructor(
    context: vscode.ExtensionContext,
    lifecycleManager: WebViewLifecycleManager,
    updateManager: WebViewUpdateManager,
    themeManager?: IThemeManager
  ) {
    this.context = context;
    this.lifecycleManager = lifecycleManager;
    this.updateManager = updateManager;
    this.themeManager = themeManager;
    this.themeDiscoveryService = new ThemeDiscoveryService(() => this.updateManager.getLastTuiFile());
    this.yamlPointerResolver = new YamlPointerResolver();
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

    switch (message.type) {
      case 'export':
        await this.handleExportMessage();
        break;
      case 'jump-to-dsl':
        await this.handleJumpToDslMessage(message as Record<string, unknown>);
        break;
      case 'webview-ready':
        await this.handleWebViewReady();
        break;
      case 'theme-switch':
        if (typeof message.themePath === 'string') {
          await this.handleThemeSwitch(message.themePath);
        } else {
          console.warn('[WebViewMessageHandler] theme-switch の themePath が無効です');
        }
        break;
      case 'get-themes':
        await this.handleGetThemes();
        break;
      default:
        console.warn('[WebViewMessageHandler] 未知のメッセージタイプ:', message.type);
    }
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
      vscode.window.showWarningMessage('ジャンプ先のDSLファイルが見つかりません。*.tui.yml を開いてください。');
      return;
    }

    try {
      const document = await vscode.workspace.openTextDocument(targetFile);
      const editor = await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      const position = this.yamlPointerResolver.resolvePosition(document, dslPath);

      if (!position) {
        vscode.window.showWarningMessage(`DSLパスを解決できませんでした: ${dslPath}`);
        return;
      }

      this.applyEditorSelection(editor, position);
      console.log(`[WebViewMessageHandler] ${componentName} を DSL にジャンプ: ${dslPath}`);
    } catch (error) {
      console.error('[WebViewMessageHandler] jump-to-dsl エラー:', error);
      vscode.window.showErrorMessage(`DSLジャンプに失敗しました: ${error}`);
    }
  }

  /**
   * エクスポートメッセージを処理
   */
  private async handleExportMessage(): Promise<void> {
    console.log('[WebViewMessageHandler] エクスポートメッセージを受信');
    const lastTuiFile = this.updateManager.getLastTuiFile();
    
    if (lastTuiFile) {
      console.log(`[WebViewMessageHandler] エクスポート用ファイル: ${lastTuiFile}`);
      await vscode.commands.executeCommand('textui-designer.export', lastTuiFile);
    } else {
      console.log('[WebViewMessageHandler] エクスポート用ファイルが見つかりません');
      vscode.window.showWarningMessage('エクスポートするファイルが見つかりません。先に.tui.ymlファイルを開いてください。');
    }
  }

  /**
   * WebView準備完了メッセージを処理
   */
  private async handleWebViewReady(): Promise<void> {
    console.log('[WebViewMessageHandler] WebView準備完了メッセージを受信');

    // 現在のVS Codeテーマをプレビューに送信（自動モードで正しくダーク/ライトを表示するため）
    const colorThemeKind = vscode.window.activeColorTheme?.kind;
    const lightThemeKind = vscode.ColorThemeKind?.Light;
    const initialTheme = colorThemeKind === lightThemeKind ? 'light' : 'dark';
    this.notifyThemeChange(initialTheme);

    // プレビューを開いた直後は必ずYAMLを送信（自動プレビュー設定に依存しない）
    await this.updateManager.sendYamlToWebview(true);
    
    // テーマ変数を適用
    if (this.themeManager) {
      this.applyThemeVariables(this.themeManager.generateCSSVariables());
    }
    
    // 利用可能なテーマ一覧を送信
    await this.sendAvailableThemes();
    
    // フォーカスを戻す
    await this.returnFocusToEditor();
  }

  /**
   * テーマ切り替えメッセージを処理
   */
  private async handleThemeSwitch(themePath: string): Promise<void> {
    console.log('[WebViewMessageHandler] テーマ切り替えメッセージを受信:', themePath);
    await this.switchTheme(themePath);
  }

  /**
   * テーマ一覧取得メッセージを処理
   */
  private async handleGetThemes(): Promise<void> {
    console.log('[WebViewMessageHandler] テーマ一覧リクエストを受信');
    await this.sendAvailableThemes();
  }

  /**
   * テーマ用CSS変数をWebViewへ送信
   */
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

  /**
   * WebViewにテーマ変更を通知
   */
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

  /**
   * 利用可能なテーマファイル一覧を検出して送信
   */
  async sendAvailableThemes(): Promise<void> {
    const panel = this.lifecycleManager.getPanel();
    if (!panel || !panel.webview) {
      return;
    }

    try {
      const themes = await this.themeDiscoveryService.detectAvailableThemes(this.themeManager);
      
      // WebViewに送信
      panel.webview.postMessage({
        type: 'available-themes',
        themes: themes
      });
    } catch (error) {
      console.error('[WebViewMessageHandler] テーマ一覧取得エラー:', error);
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
      console.log('[WebViewMessageHandler] ThemeManagerが初期化されていません');
      return;
    }

    try {
      if (!themePath) {
        // デフォルトテーマに切り替え
        console.log('[WebViewMessageHandler] デフォルトテーマに切り替え');
        
        // ThemeManagerの状態をクリア
        this.themeManager.setThemePath(undefined);
        
        // デフォルトスタイルを適用（空文字でリセット）
        this.applyThemeVariables('');
        
        // テーマ一覧を更新
        await this.sendAvailableThemes();
        
        // プレビュー内容を更新（キャッシュを活用）
        await this.updateManager.sendYamlToWebview(false);
        
        vscode.window.showInformationMessage('デフォルトテーマに切り替えました');
        return;
      }

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        console.log('[WebViewMessageHandler] ワークスペースフォルダが見つかりません');
        return;
      }

      // 相対パスから絶対パスを構築
      let fullThemePath = '';
      for (const folder of workspaceFolders) {
        const candidatePath = path.join(folder.uri.fsPath, themePath);
        if (fs.existsSync(candidatePath)) {
          fullThemePath = candidatePath;
          break;
        }
      }

      if (!fullThemePath) {
        console.log('[WebViewMessageHandler] テーマファイルが見つかりません:', themePath);
        vscode.window.showErrorMessage(`テーマファイルが見つかりません: ${themePath}`);
        return;
      }

      console.log('[WebViewMessageHandler] テーマを切り替え:', fullThemePath);
      
      // ThemeManagerのテーマパスを更新して読み込み
      this.themeManager.setThemePath(fullThemePath);
      await this.themeManager.loadTheme();
      const cssVariables = this.themeManager.generateCSSVariables();
      
      // WebViewにCSS変数を適用
      this.applyThemeVariables(cssVariables);
      
      // テーマ一覧を更新（アクティブ状態を反映）
      await this.sendAvailableThemes();
      
      // プレビュー内容を更新（キャッシュを活用）
      await this.updateManager.sendYamlToWebview(false);
      
      vscode.window.showInformationMessage(`テーマを切り替えました: ${path.basename(themePath)}`);
    } catch (error) {
      console.error('[WebViewMessageHandler] テーマ切り替えエラー:', error);
      vscode.window.showErrorMessage(`テーマ切り替えに失敗しました: ${error}`);
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
          console.log('[WebViewMessageHandler] WebView初期化完了後にtui.ymlファイルにフォーカスを戻しました');
        } catch (error) {
          console.log('[WebViewMessageHandler] フォーカスを戻すことができませんでした:', error);
        }
      }, 300);
    }
  }
}
