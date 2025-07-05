import * as vscode from 'vscode';
import { ErrorHandler } from '../utils/error-handler';

/**
 * テンプレート種別の選択肢
 */
interface TemplateTypeOption extends vscode.QuickPickItem {
  value: string;
}

/**
 * テンプレート管理を担当するサービス
 */
export class TemplateService {
  private errorHandler: typeof ErrorHandler;

  constructor(errorHandler: typeof ErrorHandler = ErrorHandler) {
    this.errorHandler = errorHandler;
  }

  /**
   * 新規テンプレート作成処理
   */
  async createTemplate(): Promise<void> {
    await this.errorHandler.withErrorHandling(async () => {
      const templateType = await this.selectTemplateType();
      if (!templateType) {return;}

      const uri = await this.selectSaveLocation();
      if (!uri) {return;}

      const templateContent = this.generateTemplateContent(templateType.value);
      await this.createTemplateFile(uri, templateContent);

      this.errorHandler.showInfo('テンプレートファイルを作成しました。');
    }, 'テンプレート作成に失敗しました');
  }

  /**
   * テンプレート挿入処理
   */
  async insertTemplate(): Promise<void> {
    await this.errorHandler.withErrorHandling(async () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        this.errorHandler.showError('アクティブなエディタがありません。');
        return;
      }

      const templateUri = await this.selectTemplateFile();
      if (!templateUri) {return;}

      const templateContent = await this.loadTemplateContent(templateUri);
      await this.insertTemplateContent(activeEditor, templateContent);

      this.errorHandler.showInfo('テンプレートを挿入しました。');
    }, 'テンプレート挿入に失敗しました');
  }

  /**
   * テンプレート種別を選択
   */
  private async selectTemplateType(): Promise<TemplateTypeOption | undefined> {
    return await vscode.window.showQuickPick([
      { label: 'フォーム', value: 'form' },
      { label: '一覧', value: 'list' },
      { label: '空', value: 'empty' }
    ], {
      placeHolder: 'テンプレート種別を選択してください'
    });
  }

  /**
   * 保存先を選択
   */
  private async selectSaveLocation(): Promise<vscode.Uri | undefined> {
    return await vscode.window.showSaveDialog({
      filters: {
        'YAML Template': ['template.yml', 'template.yaml']
      }
    });
  }

  /**
   * テンプレートファイルを選択
   */
  private async selectTemplateFile(): Promise<vscode.Uri | undefined> {
    const uris = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        'YAML Template': ['template.yml', 'template.yaml']
      }
    });

    return uris && uris.length > 0 ? uris[0] : undefined;
  }

  /**
   * テンプレートファイルを作成
   */
  private async createTemplateFile(uri: vscode.Uri, content: string): Promise<void> {
    const document = await vscode.workspace.openTextDocument({
      content,
      language: 'yaml'
    });

    await vscode.window.showTextDocument(document);
    await document.save();
  }

  /**
   * テンプレート内容を読み込み
   */
  private async loadTemplateContent(uri: vscode.Uri): Promise<string> {
    const document = await vscode.workspace.openTextDocument(uri);
    return document.getText();
  }

  /**
   * テンプレート内容を挿入
   */
  private async insertTemplateContent(
    editor: vscode.TextEditor, 
    content: string
  ): Promise<void> {
    await editor.edit(editBuilder => {
      const position = editor.selection.active;
      editBuilder.insert(position, content);
    });
  }

  /**
   * テンプレート内容を生成
   */
  private generateTemplateContent(type: string): string {
    switch (type) {
      case 'form':
        return this.getFormTemplate();
      case 'list':
        return this.getListTemplate();
      case 'empty':
      default:
        return this.getEmptyTemplate();
    }
  }

  /**
   * フォームテンプレート
   */
  private getFormTemplate(): string {
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
  }

  /**
   * 一覧テンプレート
   */
  private getListTemplate(): string {
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
  }

  /**
   * 空テンプレート
   */
  private getEmptyTemplate(): string {
    return `- Container:
    layout: vertical
    components:
      - Text:
          variant: h1
          value: "タイトル"
      - Text:
          variant: p
          value: "コンテンツをここに追加してください"`;
  }
} 