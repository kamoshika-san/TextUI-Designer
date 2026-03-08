import * as vscode from 'vscode';
import { WebViewLifecycleManager } from './webview-lifecycle-manager';
import { WebViewUpdateManager } from './webview-update-manager';
import { isWebViewMessage, type IThemeManager } from '../../types';
import { ConfigManager } from '../../utils/config-manager';

/**
 * WebViewとのメッセージ通信を担当
 * メッセージの受信・送信・ルーティングを一元化
 */
export class WebViewMessageHandler {
  private lifecycleManager: WebViewLifecycleManager;
  private updateManager: WebViewUpdateManager;
  private themeManager: IThemeManager | undefined;
  private context: vscode.ExtensionContext;

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
      const position = this.resolveYamlPointerPosition(document, dslPath);

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
      const themes = await this.detectAvailableThemes();
      
      // WebViewに送信
      panel.webview.postMessage({
        type: 'available-themes',
        themes: themes
      });
    } catch (error) {
      console.error('[WebViewMessageHandler] テーマ一覧取得エラー:', error);
    }
  }

  /**
   * 利用可能なテーマを検出
   */
  private async detectAvailableThemes(): Promise<{ name: string; path: string; isActive: boolean; description?: string }[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      console.log('[WebViewMessageHandler] ワークスペースフォルダが見つかりません');
      return [];
    }

    const themes: { name: string; path: string; isActive: boolean; description?: string }[] = [];
    
    // 現在のアクティブテーマパスを取得
    const currentThemePath = this.themeManager?.getThemePath() || '';
    const isDefaultThemeActive = !currentThemePath;
    
    console.log('[WebViewMessageHandler] 現在のテーマパス:', currentThemePath);
    console.log('[WebViewMessageHandler] デフォルトテーマがアクティブ:', isDefaultThemeActive);
    
    const discoveredPaths = new Set<string>();

    const activeTuiPath = this.resolveActiveTuiPath();

    // 各ワークスペースフォルダでテーマファイルを検索
    for (const folder of workspaceFolders) {
      const folderPath = folder.uri.fsPath;

      const searchRoot = this.resolveThemeSearchRoot(folderPath, activeTuiPath);
      const themeFiles = this.collectThemeFiles(searchRoot);

      for (const filePath of themeFiles) {
        const normalizedPath = path.resolve(filePath);
        if (discoveredPaths.has(normalizedPath)) {
          continue;
        }
        discoveredPaths.add(normalizedPath);

        const relativePath = path.relative(folderPath, filePath);
        const fileName = path.basename(filePath);

        // テーマファイルの内容を読み取って名前と説明を取得
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const themeData = YAML.parse(content);

          const themeName = themeData?.theme?.name || fileName.replace(/(-theme|_theme)\.(ya?ml)$/, '').replace(/\.(ya?ml)$/, '');
          const themeDescription = themeData?.theme?.description;

          // 現在のアクティブテーマかどうかを判定（パスの正規化で比較）
          const isActive = Boolean(currentThemePath) &&
            path.resolve(currentThemePath) === path.resolve(filePath);

          themes.push({
            name: themeName,
            path: relativePath,
            isActive,
            description: themeDescription
          });
        } catch (error) {
          console.log(`[WebViewMessageHandler] テーマファイル読み取りエラー: ${filePath}`, error);
          // エラーの場合はファイル名のみで追加
          themes.push({
            name: fileName.replace(/(-theme|_theme)\.(ya?ml)$/, '').replace(/\.(ya?ml)$/, ''),
            path: relativePath,
            isActive: false
          });
        }
      }
    }

    // デフォルトテーマを追加（常に先頭に配置）
    themes.unshift({
      name: 'デフォルト',
      path: '',
      isActive: isDefaultThemeActive,
      description: 'システムデフォルトテーマ'
    });

    console.log('[WebViewMessageHandler] 検出されたテーマ:', themes);
    return themes;
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

  private resolveThemeSearchRoot(folderPath: string, activeTuiPath?: string): string {
    if (!activeTuiPath) {
      return folderPath;
    }

    const normalizedFolder = path.resolve(folderPath);
    const normalizedActiveFile = path.resolve(activeTuiPath);
    const activeDir = path.dirname(normalizedActiveFile);

    if (!activeDir.startsWith(normalizedFolder)) {
      return folderPath;
    }

    return activeDir;
  }

  private collectThemeFiles(rootPath: string): string[] {
    if (!fs.existsSync(rootPath)) {
      return [];
    }

    const themeFiles: string[] = [];
    const skipDirs = new Set(['.git', 'node_modules', 'out', 'media', '.next', 'dist', 'build']);
    const stack: string[] = [rootPath];

    while (stack.length > 0) {
      const currentPath = stack.pop();
      if (!currentPath) {
        continue;
      }

      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(currentPath, { withFileTypes: true });
      } catch (error) {
        console.log(`[WebViewMessageHandler] ディレクトリ読み取りエラー: ${currentPath}`, error);
        continue;
      }

      for (const entry of entries) {
        const entryPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          if (!skipDirs.has(entry.name)) {
            stack.push(entryPath);
          }
          continue;
        }

        if (
          entry.name.endsWith('-theme.yml') ||
          entry.name.endsWith('-theme.yaml') ||
          entry.name.endsWith('_theme.yml') ||
          entry.name.endsWith('_theme.yaml') ||
          entry.name === 'textui-theme.yml' ||
          entry.name === 'textui-theme.yaml'
        ) {
          themeFiles.push(entryPath);
        }
      }
    }

    return themeFiles;
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

  private resolveYamlPointerPosition(document: vscode.TextDocument, pointer: string): vscode.Position | null {
    const normalizedPointer = pointer.startsWith('/') ? pointer : `/${pointer}`;
    if (normalizedPointer === '/') {
      return this.createPosition(0, 0);
    }

    try {
      const yamlDocument = YAML.parseDocument(document.getText(), {
        prettyErrors: false
      });
      const rootNode = yamlDocument.contents as unknown;
      const segments = normalizedPointer
        .split('/')
        .slice(1)
        .map(segment => segment.replace(/~1/g, '/').replace(/~0/g, '~'));

      const node = this.resolveNodeByPointer(rootNode, segments);
      const offset = this.extractNodeStartOffset(node);
      if (offset === null) {
        return null;
      }
      const fromDocument = document.positionAt(offset);
      return this.createPosition(fromDocument.line, fromDocument.character);
    } catch (error) {
      console.warn('[WebViewMessageHandler] YAML pointer解決に失敗しました:', error);
      return null;
    }
  }

  private resolveNodeByPointer(rootNode: unknown, segments: string[]): unknown {
    let currentNode: unknown = rootNode;

    for (const segment of segments) {
      if (this.isYamlMapNode(currentNode)) {
        const pair = currentNode.items.find(item => this.readYamlKey(item?.key) === segment);
        if (!pair) {
          return null;
        }
        currentNode = pair.value;
        continue;
      }

      if (this.isYamlSeqNode(currentNode)) {
        const index = Number(segment);
        if (!Number.isInteger(index) || index < 0 || index >= currentNode.items.length) {
          return null;
        }
        currentNode = currentNode.items[index];
        continue;
      }

      return null;
    }

    return currentNode;
  }

  private extractNodeStartOffset(node: unknown): number | null {
    if (!node || typeof node !== 'object') {
      return null;
    }
    const range = (node as { range?: unknown }).range;
    if (!Array.isArray(range) || typeof range[0] !== 'number') {
      return null;
    }
    return range[0];
  }

  private readYamlKey(keyNode: unknown): string | null {
    if (!keyNode || typeof keyNode !== 'object') {
      return null;
    }
    const value = (keyNode as { value?: unknown }).value;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return null;
  }

  private isYamlMapNode(node: unknown): node is { items: Array<{ key?: unknown; value?: unknown }> } {
    if (!node || typeof node !== 'object') {
      return false;
    }
    const items = (node as { items?: unknown }).items;
    if (!Array.isArray(items)) {
      return false;
    }
    if (items.length === 0) {
      return false;
    }
    const firstItem = items[0];
    return Boolean(firstItem && typeof firstItem === 'object' && 'key' in firstItem && 'value' in firstItem);
  }

  private isYamlSeqNode(node: unknown): node is { items: unknown[] } {
    if (!node || typeof node !== 'object') {
      return false;
    }
    const items = (node as { items?: unknown }).items;
    if (!Array.isArray(items)) {
      return false;
    }
    if (items.length === 0) {
      return true;
    }
    const firstItem = items[0];
    return !(firstItem && typeof firstItem === 'object' && 'key' in firstItem && 'value' in firstItem);
  }

  private createPosition(line: number, character: number): vscode.Position {
    return typeof (vscode as { Position?: unknown }).Position === 'function'
      ? new vscode.Position(line, character)
      : ({ line, character } as unknown as vscode.Position);
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

// 必要なインポートを追加
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml'; 
