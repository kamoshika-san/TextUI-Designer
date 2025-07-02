import * as vscode from 'vscode';
import { WebViewLifecycleManager } from './webview-lifecycle-manager';
import { WebViewUpdateManager } from './webview-update-manager';
import { ThemeManager } from '../theme-manager';

/**
 * WebViewとのメッセージ通信を担当
 * メッセージの受信・送信・ルーティングを一元化
 */
export class WebViewMessageHandler {
  private lifecycleManager: WebViewLifecycleManager;
  private updateManager: WebViewUpdateManager;
  private themeManager: ThemeManager | undefined;
  private context: vscode.ExtensionContext;

  constructor(
    context: vscode.ExtensionContext,
    lifecycleManager: WebViewLifecycleManager,
    updateManager: WebViewUpdateManager,
    themeManager?: ThemeManager
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
  private async handleMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'export':
        await this.handleExportMessage();
        break;
      case 'webview-ready':
        await this.handleWebViewReady();
        break;
      case 'theme-switch':
        await this.handleThemeSwitch(message.themePath);
        break;
      case 'get-themes':
        await this.handleGetThemes();
        break;
      default:
        console.warn('[WebViewMessageHandler] 未知のメッセージタイプ:', message.type);
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
    
    // YAMLデータを送信
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
  private async sendAvailableThemes(): Promise<void> {
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
    const currentThemePath = this.themeManager ? (this.themeManager as any).themePath : '';
    const isDefaultThemeActive = !currentThemePath;
    
    console.log('[WebViewMessageHandler] 現在のテーマパス:', currentThemePath);
    console.log('[WebViewMessageHandler] デフォルトテーマがアクティブ:', isDefaultThemeActive);
    
    // 各ワークスペースフォルダでテーマファイルを検索
    for (const folder of workspaceFolders) {
      const folderPath = folder.uri.fsPath;
      
      // サンプルフォルダとルートディレクトリでテーマファイルを検索
      const searchPaths = [
        path.join(folderPath, 'sample'),
        path.join(folderPath, 'textui-designer', 'sample'),
        folderPath
      ];

      for (const searchPath of searchPaths) {
        if (!fs.existsSync(searchPath)) {
          continue;
        }

        const files = fs.readdirSync(searchPath);
        const themeFiles = files.filter(file => 
          file.endsWith('-theme.yml') || 
          file.endsWith('_theme.yml') || 
          file === 'textui-theme.yml'
        );

        for (const file of themeFiles) {
          const filePath = path.join(searchPath, file);
          const relativePath = path.relative(folderPath, filePath);
          
          // テーマファイルの内容を読み取って名前と説明を取得
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const themeData = YAML.parse(content);
            
            const themeName = themeData?.theme?.name || file.replace(/(-theme|_theme)\.yml$/, '').replace(/\.yml$/, '');
            const themeDescription = themeData?.theme?.description;
            
            // 現在のアクティブテーマかどうかを判定（パスの正規化で比較）
            const isActive = currentThemePath && 
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
              name: file.replace(/(-theme|_theme)\.yml$/, '').replace(/\.yml$/, ''),
              path: relativePath,
              isActive: false
            });
          }
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

  /**
   * テーマを切り替え
   */
  private async switchTheme(themePath: string): Promise<void> {
    if (!this.themeManager) {
      console.log('[WebViewMessageHandler] ThemeManagerが初期化されていません');
      return;
    }

    try {
      if (!themePath) {
        // デフォルトテーマに切り替え
        console.log('[WebViewMessageHandler] デフォルトテーマに切り替え');
        
        // ThemeManagerの状態をクリア
        (this.themeManager as any).themePath = '';
        
        // デフォルトスタイルを適用（空文字でリセット）
        this.applyThemeVariables('');
        
        // テーマ一覧を更新
        await this.sendAvailableThemes();
        
        // プレビュー内容を強制更新してテーマ変更を即座に反映
        await this.updateManager.sendYamlToWebview(true);
        
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
      (this.themeManager as any).themePath = fullThemePath;
      await this.themeManager.loadTheme();
      const cssVariables = this.themeManager.generateCSSVariables();
      
      // WebViewにCSS変数を適用
      this.applyThemeVariables(cssVariables);
      
      // テーマ一覧を更新（アクティブ状態を反映）
      await this.sendAvailableThemes();
      
      // プレビュー内容を強制更新してテーマ変更を即座に反映
      await this.updateManager.sendYamlToWebview(true);
      
      vscode.window.showInformationMessage(`テーマを切り替えました: ${path.basename(themePath)}`);
    } catch (error) {
      console.error('[WebViewMessageHandler] テーマ切り替えエラー:', error);
      vscode.window.showErrorMessage(`テーマ切り替えに失敗しました: ${error}`);
    }
  }

  /**
   * エディタにフォーカスを戻す
   */
  private async returnFocusToEditor(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    const shouldReturnFocus = activeEditor && activeEditor.document.fileName.endsWith('.tui.yml');
    
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