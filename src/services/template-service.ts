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
    const result = await this.errorHandler.executeSafely(async () => {
      const templateType = await this.selectTemplateType();
      if (!templateType) {return;}

      const uri = await this.selectSaveLocation();
      if (!uri) {return;}

      const templateContent = this.generateTemplateContent(templateType.value);
      await this.createTemplateFile(uri, templateContent);

      this.errorHandler.showInfo('テンプレートファイルを作成しました。');
    }, 'テンプレート作成に失敗しました');

    if (!result) {
      // エラーハンドリングは既にErrorHandlerで処理済み
      return;
    }
  }

  /**
   * テンプレート挿入処理
   */
  async insertTemplate(): Promise<void> {
    const result = await this.errorHandler.executeSafely(async () => {
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

    if (!result) {
      // エラーハンドリングは既にErrorHandlerで処理済み
      return;
    }
  }

  /**
   * テンプレート種別を選択
   */
  private async selectTemplateType(): Promise<TemplateTypeOption | undefined> {
    return await vscode.window.showQuickPick([
      { label: 'フォーム（会員登録）', detail: '入力フォーム + 利用規約同意 + 送信導線', value: 'form' },
      { label: 'ダッシュボード', detail: 'KPIカード・通知・アクションを含む管理画面', value: 'dashboard' },
      { label: 'ステップフォーム', detail: '進捗表示つきのマルチステップ入力', value: 'stepForm' }
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
      case 'dashboard':
        return this.getDashboardTemplate();
      case 'stepForm':
        return this.getStepFormTemplate();
      default:
        return this.getFormTemplate();
    }
  }

  /**
   * フォームテンプレート
   */
  private getFormTemplate(): string {
    return `# 用途: 初回登録・問い合わせなどの単一画面フォーム
# ポイント: TextUI Previewですぐ確認できるよう、最小テーマを同梱
theme:
  tokens:
    color:
      primary: "#2563eb"
      surface: "#f8fafc"

page:
  id: signup-form-template
  title: "会員登録フォーム"
  layout: vertical
  components:
    - Text:
        variant: h1
        value: "新規会員登録"
    - Text:
        variant: p
        value: "必要事項を入力してアカウントを作成してください。"
    - Form:
        id: memberSignupForm
        fields:
          - Input:
              label: "お名前"
              name: fullName
              type: text
              required: true
          - Input:
              label: "メールアドレス"
              name: email
              type: email
              required: true
          - Select:
              label: "プラン"
              name: plan
              options:
                - label: "Free"
                  value: "free"
                - label: "Pro"
                  value: "pro"
          - Checkbox:
              label: "利用規約に同意する"
              name: terms
              required: true
        actions:
          - Button:
              kind: primary
              label: "登録する"
              submit: true`;
  }

  /**
   * ダッシュボードテンプレート
   */
  private getDashboardTemplate(): string {
    return `# 用途: 運用画面・管理画面の初期プロトタイプ
# ポイント: KPI / 通知 / アクションをひとつの画面に集約
theme:
  tokens:
    color:
      primary: "#0f766e"
      info: "#0ea5e9"

page:
  id: operations-dashboard-template
  title: "運用ダッシュボード"
  layout: vertical
  components:
    - Text:
        variant: h1
        value: "今日のサマリー"
    - Container:
        layout: horizontal
        components:
          - Alert:
              variant: info
              message: "新規申込 24件"
          - Alert:
              variant: success
              message: "決済成功率 98.3%"
          - Alert:
              variant: warning
              message: "要確認チケット 3件"
    - Divider:
        orientation: horizontal
    - Text:
        variant: h2
        value: "クイックアクション"
    - Container:
        layout: horizontal
        components:
          - Button:
              kind: primary
              label: "レポートを出力"
          - Button:
              kind: secondary
              label: "担当者へ通知"
    - Text:
        variant: p
        value: "最新更新: 10:45"`;
  }

  /**
   * ステップフォームテンプレート
   */
  private getStepFormTemplate(): string {
    return `# 用途: オンボーディングや申請フローの段階入力
# ポイント: ステップ表示をテキストで表現し、主要入力コンポーネントを網羅
theme:
  tokens:
    color:
      primary: "#7c3aed"
      muted: "#64748b"

page:
  id: onboarding-step-form-template
  title: "3ステップ申請フォーム"
  layout: vertical
  components:
    - Text:
        variant: h1
        value: "アカウント設定"
    - Text:
        variant: p
        value: "Step 2 / 3: 連絡先情報を入力してください"
    - Divider:
        orientation: horizontal
    - Input:
        label: "会社名"
        name: company
        type: text
        required: true
    - Input:
        label: "電話番号"
        name: phone
        type: tel
    - Radio:
        label: "連絡方法"
        name: contactMethod
        options:
          - label: "メール"
            value: "email"
          - label: "電話"
            value: "phone"
    - Checkbox:
        label: "次回からこの情報を自動入力する"
        name: rememberProfile
    - Container:
        layout: horizontal
        components:
          - Button:
              kind: secondary
              label: "戻る"
          - Button:
              kind: primary
              label: "次へ"
              submit: true`;
  }
}
