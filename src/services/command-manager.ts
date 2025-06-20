import * as vscode from 'vscode';
import { WebViewManager } from './webview-manager';
import { ExportManager } from '../exporters';
import path from 'path';

/**
 * コマンド管理サービス
 * VS Code拡張のコマンド登録と実行を担当
 */
export class CommandManager {
  private context: vscode.ExtensionContext;
  private webViewManager: WebViewManager;
  private exportManager: ExportManager;

  constructor(
    context: vscode.ExtensionContext,
    webViewManager: WebViewManager,
    exportManager: ExportManager
  ) {
    this.context = context;
    this.webViewManager = webViewManager;
    this.exportManager = exportManager;
  }

  /**
   * すべてのコマンドを登録
   */
  registerCommands(): void {
    this.registerPreviewCommand();
    this.registerExportCommand();
    this.registerDevToolsCommand();
    this.registerTemplateCommands();
  }

  /**
   * プレビューコマンドを登録
   */
  private registerPreviewCommand(): void {
    const disposable = vscode.commands.registerCommand('textui-designer.openPreview', async () => {
      await this.webViewManager.openPreview();
    });
    this.context.subscriptions.push(disposable);
  }

  /**
   * エクスポートコマンドを登録
   */
  private registerExportCommand(): void {
    const disposable = vscode.commands.registerCommand('textui-designer.export', async () => {
      await this.handleExport();
    });
    this.context.subscriptions.push(disposable);
  }

  /**
   * 開発者ツールコマンドを登録
   */
  private registerDevToolsCommand(): void {
    const disposable = vscode.commands.registerCommand('textui-designer.openDevTools', () => {
      this.webViewManager.openDevTools();
    });
    this.context.subscriptions.push(disposable);
  }

  /**
   * テンプレート関連コマンドを登録
   */
  private registerTemplateCommands(): void {
    // 新規テンプレート作成コマンド
    const createTemplateDisposable = vscode.commands.registerCommand('textui-designer.createTemplate', async () => {
      await this.handleCreateTemplate();
    });
    this.context.subscriptions.push(createTemplateDisposable);

    // テンプレート挿入コマンド
    const insertTemplateDisposable = vscode.commands.registerCommand('textui-designer.insertTemplate', async () => {
      await this.handleInsertTemplate();
    });
    this.context.subscriptions.push(insertTemplateDisposable);
  }

  /**
   * エクスポート処理を実行
   */
  private async handleExport(): Promise<void> {
    try {
      const activeEditor = vscode.window.activeTextEditor;
      let filePath: string | undefined;

      if (activeEditor && activeEditor.document.fileName.endsWith('.tui.yml')) {
        filePath = activeEditor.document.fileName;
      } else {
        // アクティブなエディタがない場合は最後に開いていたファイルを使用
        filePath = this.webViewManager.getLastTuiFile();
      }

      if (!filePath) {
        vscode.window.showErrorMessage('エクスポート対象の.tui.ymlファイルが見つかりません。');
        return;
      }

      // エクスポート形式を選択
      const format = await vscode.window.showQuickPick(
        this.exportManager.getSupportedFormats(),
        {
          placeHolder: 'エクスポート形式を選択してください'
        }
      );

      if (!format) return;

      // 保存先を選択
      const extension = this.exportManager.getFileExtension(format);
      const uri = await vscode.window.showSaveDialog({
        filters: {
          [`${format.toUpperCase()} Files`]: [extension]
        }
      });

      if (!uri) return;

      // エクスポート実行
      const content = await this.exportManager.exportFromFile(filePath, {
        format: format as 'react' | 'pug' | 'html',
        outputPath: uri.fsPath,
        fileName: path.basename(uri.fsPath)
      });

      // ファイルに保存
      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));

      vscode.window.showInformationMessage(`${format.toUpperCase()}ファイルをエクスポートしました: ${uri.fsPath}`);
    } catch (error) {
      vscode.window.showErrorMessage(`エクスポートに失敗しました: ${error}`);
    }
  }

  /**
   * 新規テンプレート作成処理
   */
  private async handleCreateTemplate(): Promise<void> {
    try {
      // テンプレート種別を選択
      const templateType = await vscode.window.showQuickPick([
        { label: 'フォーム', value: 'form' },
        { label: '一覧', value: 'list' },
        { label: '空', value: 'empty' }
      ], {
        placeHolder: 'テンプレート種別を選択してください'
      });

      if (!templateType) return;

      // 保存先を選択
      const uri = await vscode.window.showSaveDialog({
        filters: {
          'YAML Template': ['template.yml', 'template.yaml']
        }
      });

      if (!uri) return;

      // テンプレート内容を生成
      const templateContent = this.generateTemplateContent(templateType.value);

      // ファイルを作成
      const document = await vscode.workspace.openTextDocument({
        content: templateContent,
        language: 'yaml'
      });

      await vscode.window.showTextDocument(document);
      await document.save();

      vscode.window.showInformationMessage('テンプレートファイルを作成しました。');
    } catch (error) {
      vscode.window.showErrorMessage(`テンプレート作成に失敗しました: ${error}`);
    }
  }

  /**
   * テンプレート挿入処理
   */
  private async handleInsertTemplate(): Promise<void> {
    try {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showErrorMessage('アクティブなエディタがありません。');
        return;
      }

      // テンプレートファイルを選択
      const uris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'YAML Template': ['template.yml', 'template.yaml']
        }
      });

      if (!uris || uris.length === 0) return;

      const templateUri = uris[0];
      const templateDocument = await vscode.workspace.openTextDocument(templateUri);
      const templateContent = templateDocument.getText();

      // 現在のエディタに挿入
      await activeEditor.edit(editBuilder => {
        const position = activeEditor.selection.active;
        editBuilder.insert(position, templateContent);
      });

      vscode.window.showInformationMessage('テンプレートを挿入しました。');
    } catch (error) {
      vscode.window.showErrorMessage(`テンプレート挿入に失敗しました: ${error}`);
    }
  }

  /**
   * テンプレート内容を生成
   */
  private generateTemplateContent(type: string): string {
    switch (type) {
      case 'form':
        return `- Form:
    id: myForm
    fields:
      - Input:
          label: ユーザー名
          name: username
          type: text
          required: true
      - Input:
          label: メールアドレス
          name: email
          type: email
          required: true
      - Checkbox:
          label: 利用規約に同意する
          name: agree
          required: true
    actions:
      - Button:
          kind: submit
          label: 送信
          submit: true`;
      
      case 'list':
        return `- Container:
    layout: vertical
    components:
      - Text:
          variant: h2
          value: "一覧"
      - Divider:
          orientation: horizontal
      - Text:
          variant: p
          value: "リストアイテム1"
      - Text:
          variant: p
          value: "リストアイテム2"
      - Text:
          variant: p
          value: "リストアイテム3"`;
      
      case 'empty':
      default:
        return `# 空のテンプレート
# ここにコンポーネントを追加してください`;
    }
  }
} 