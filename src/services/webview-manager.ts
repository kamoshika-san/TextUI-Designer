import * as vscode from 'vscode';
import * as YAML from 'yaml';
import { getWebviewContent } from '../utils/webview-utils';

/**
 * WebView管理サービス
 * プレビュー画面のWebView管理を担当
 */
export class WebViewManager {
  private currentPanel: vscode.WebviewPanel | undefined = undefined;
  private context: vscode.ExtensionContext;
  private lastTuiFile: string | undefined = undefined;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * プレビューを開く
   */
  async openPreview(): Promise<void> {
    const columnToShowIn = vscode.ViewColumn.Two;

    if (this.currentPanel) {
      this.currentPanel.reveal(columnToShowIn);
    } else {
      this.currentPanel = vscode.window.createWebviewPanel(
        'textuiPreview',
        'TextUI Preview',
        columnToShowIn,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          enableFindWidget: true,
          localResourceRoots: [this.context.extensionUri],
          ...(process.env.NODE_ENV === 'development' && {
            enableCommandUris: true,
          }),
        }
      );

      // WebViewのHTMLをセット
      this.currentPanel.webview.html = getWebviewContent(this.context, this.currentPanel);

      // 初回データ送信
      await this.sendYamlToWebview();

      // WebViewからのメッセージを処理
      this.currentPanel.webview.onDidReceiveMessage(
        async (message) => {
          if (message.type === 'export') {
            await vscode.commands.executeCommand('textui-designer.export');
          }
        },
        undefined,
        this.context.subscriptions
      );

      // パネルが閉じられたときの処理
      this.currentPanel.onDidDispose(
        () => {
          this.currentPanel = undefined;
        },
        null,
        this.context.subscriptions
      );
    }
  }

  /**
   * プレビューを更新
   */
  async updatePreview(): Promise<void> {
    if (this.currentPanel) {
      await this.sendYamlToWebview();
    } else {
      // プレビューが開かれていない場合は自動的に開く
      await this.openPreview();
    }
  }

  /**
   * 最後に開いていたtui.ymlファイルのパスを設定
   */
  setLastTuiFile(filePath: string): void {
    this.lastTuiFile = filePath;
  }

  /**
   * 最後に開いていたtui.ymlファイルのパスを取得
   */
  getLastTuiFile(): string | undefined {
    return this.lastTuiFile;
  }

  /**
   * WebViewにYAMLデータを送信
   */
  private async sendYamlToWebview(): Promise<void> {
    if (!this.currentPanel) {
      console.log('[WebViewManager] パネルが存在しません');
      return;
    }

    try {
      const activeEditor = vscode.window.activeTextEditor;
      let yamlContent = '';
      let fileName = '';

      console.log(`[WebViewManager] アクティブエディタ: ${activeEditor?.document.fileName}`);
      console.log(`[WebViewManager] 最後のファイル: ${this.lastTuiFile}`);

      if (activeEditor && activeEditor.document.fileName.endsWith('.tui.yml')) {
        yamlContent = activeEditor.document.getText();
        fileName = activeEditor.document.fileName;
        this.setLastTuiFile(fileName);
        console.log(`[WebViewManager] アクティブエディタからYAMLを取得: ${fileName}`);
        console.log(`[WebViewManager] YAML内容: ${yamlContent.substring(0, 200)}...`);
      } else if (this.lastTuiFile) {
        // アクティブなエディタがない場合は最後に開いていたファイルを使用
        const document = await vscode.workspace.openTextDocument(this.lastTuiFile);
        yamlContent = document.getText();
        fileName = this.lastTuiFile;
        console.log(`[WebViewManager] 最後のファイルからYAMLを取得: ${fileName}`);
        console.log(`[WebViewManager] YAML内容: ${yamlContent.substring(0, 200)}...`);
      } else {
        // デフォルトのサンプルデータ
        yamlContent = `page:
  id: sample
  title: "サンプル"
  layout: vertical
  components:
    - Text:
        variant: h1
        value: "TextUI Designer"
    - Text:
        variant: p
        value: "プレビューが表示されています"`;
        fileName = 'sample.tui.yml';
        console.log(`[WebViewManager] サンプルデータを使用`);
        console.log(`[WebViewManager] YAML内容: ${yamlContent}`);
      }

      const yaml = YAML.parse(yamlContent);
      console.log(`[WebViewManager] YAML解析成功、WebViewに送信: ${fileName}`);
      console.log(`[WebViewManager] 解析結果:`, yaml);
      
      const message = {
        type: 'update',
        data: yaml,
        fileName: fileName
      };
      
      console.log(`[WebViewManager] 送信メッセージ:`, message);
      this.currentPanel.webview.postMessage(message);
      console.log(`[WebViewManager] メッセージ送信完了`);
    } catch (error) {
      console.error('[WebViewManager] YAMLデータの送信に失敗しました:', error);
      this.currentPanel.webview.postMessage({
        type: 'error',
        message: `YAMLの解析に失敗しました: ${error}`
      });
    }
  }

  /**
   * 開発者ツールを開く
   */
  openDevTools(): void {
    if (this.currentPanel) {
      this.currentPanel.webview.postMessage({ type: 'openDevTools' });
    } else {
      vscode.window.showWarningMessage('プレビューが開かれていません。先にプレビューを開いてください。');
    }
  }

  /**
   * WebViewパネルが存在するかチェック
   */
  hasPanel(): boolean {
    return this.currentPanel !== undefined;
  }

  /**
   * WebViewパネルを取得
   */
  getPanel(): vscode.WebviewPanel | undefined {
    return this.currentPanel;
  }
} 