import * as vscode from 'vscode';
import { ExtensionServices } from './service-initializer';
import { ConfigManager } from '../utils/config-manager';

/**
 * イベントリスナーの登録・管理
 * VSCodeの各種イベントリスナーの登録と管理を担当
 */
export class EventManager {
  private context: vscode.ExtensionContext;
  private services: ExtensionServices | null = null;
  private disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * イベントマネージャーの初期化
   */
  initialize(services: ExtensionServices): void {
    console.log('[EventManager] イベントマネージャー初期化開始');
    
    this.services = services;
    
    // 補完プロバイダーの登録
    this.registerCompletionProvider();
    
    // 設定変更の監視
    this.registerSettingsWatcher();
    
    // VSCodeテーマ変更の監視
    this.registerThemeChangeWatcher();
    
    // 設定変更の監視（VSCode設定）
    this.registerVSCodeSettingsWatcher();
    
    // ドキュメントオープン・クローズハンドラー
    this.registerDocumentOpenHandler();
    this.registerDocumentCloseHandler();
    
    console.log('[EventManager] イベントマネージャー初期化完了');
  }

  /**
   * 補完プロバイダーの登録
   */
  private registerCompletionProvider(): void {
    if (!this.services) {return;}

    const completionDisposable = vscode.languages.registerCompletionItemProvider(
      [
        { language: 'yaml' },
        { language: 'yaml', scheme: 'file' },
        { language: 'yaml', scheme: 'untitled' }
      ],
      this.services.completionProvider,
      '-', ':', ' ' // トリガー文字を追加
    );
    
    this.disposables.push(completionDisposable);
    console.log('[EventManager] 補完プロバイダーを登録しました');
  }

  /**
   * 設定変更の監視
   */
  private registerSettingsWatcher(): void {
    if (!this.services) {return;}

    const settingsWatcher = this.services.settingsService.startWatching(() => {
      // Auto Preview設定の変更は、プレビュー画面の自動表示/非表示のみに影響
      // 既に開かれているプレビュー画面は維持する
      
      // スキーマ関連の設定が変更された場合は再初期化
      const schemaSettings = ConfigManager.getSchemaSettings();
      if (schemaSettings.validationEnabled) {
        this.services!.schemaManager.reinitialize().catch(error => {
          console.error('スキーマの再初期化に失敗しました:', error);
        });
      }
    });
    
    this.disposables.push(settingsWatcher);
    console.log('[EventManager] 設定変更監視を登録しました');
  }

  /**
   * VSCodeテーマ変更の監視
   */
  private registerThemeChangeWatcher(): void {
    if (!this.services) {return;}

    const themeChangeDisposable = vscode.window.onDidChangeActiveColorTheme(colorTheme => {
      // WebViewにテーマ変更を通知
      const theme = colorTheme.kind === vscode.ColorThemeKind.Light ? 'light' : 'dark';
      this.services!.webViewManager.notifyThemeChange(theme);
    });
    
    this.disposables.push(themeChangeDisposable);
    console.log('[EventManager] VSCodeテーマ変更監視を登録しました');
  }

  /**
   * VSCode設定変更の監視
   */
  private registerVSCodeSettingsWatcher(): void {
    const settingsDisposable = vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('textui-designer.autoPreview.enabled')) {
        // 設定変更時の処理は既にsettingsWatcherで処理済み
        console.log('[EventManager] VSCode設定変更を検知しました');
      }
    });
    
    this.disposables.push(settingsDisposable);
    console.log('[EventManager] VSCode設定変更監視を登録しました');
  }

  /**
   * ドキュメントを開いた時の診断
   */
  registerDocumentOpenHandler(): void {
    if (!this.services) {return;}

    const documentOpenDisposable = vscode.workspace.onDidOpenTextDocument(document => {
      const diagnosticSettings = ConfigManager.getDiagnosticSettings();
      if (diagnosticSettings.enabled) {
        this.services!.diagnosticManager.validateAndReportDiagnostics(document);
      }
    });
    
    this.disposables.push(documentOpenDisposable);
    console.log('[EventManager] ドキュメントオープン監視を登録しました');
  }

  /**
   * ドキュメントを閉じた時の診断クリア
   */
  registerDocumentCloseHandler(): void {
    if (!this.services) {return;}

    const documentCloseDisposable = vscode.workspace.onDidCloseTextDocument(document => {
      this.services!.diagnosticManager.clearDiagnosticsForUri(document.uri);
    });
    
    this.disposables.push(documentCloseDisposable);
    console.log('[EventManager] ドキュメントクローズ監視を登録しました');
  }

  /**
   * リソースのクリーンアップ
   */
  dispose(): void {
    console.log('[EventManager] イベントマネージャーのクリーンアップ開始');
    
    // 全disposableを破棄
    this.disposables.forEach(disposable => {
      try {
        disposable.dispose();
      } catch (error) {
        console.error('[EventManager] disposable破棄中にエラーが発生しました:', error);
      }
    });
    
    this.disposables = [];
    this.services = null;
    
    console.log('[EventManager] イベントマネージャーのクリーンアップ完了');
  }
} 