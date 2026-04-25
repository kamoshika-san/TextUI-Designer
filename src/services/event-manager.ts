import * as vscode from 'vscode';
import { ExtensionServices } from './service-initializer';
import { ConfigManager } from '../utils/config-manager';
import { getDocumentKind } from './document-kind-resolver';
import { Logger } from '../utils/logger';
import { cursorLineToComponentIndex } from './webview/cursor-to-component';
import { toVscodeCompletionItemProvider } from './vscode-host-adapters';

/**
 * イベントリスナーの登録・管理
 * VSCodeの各種イベントリスナーの登録と管理を担当
 */
export class EventManager {
  private readonly logger = new Logger('EventManager');
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
    this.logger.debug('イベントマネージャー初期化開始');
    
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

    // カーソル位置 → コンポーネントハイライト
    this.registerCursorHighlightHandler();

    this.logger.debug('イベントマネージャー初期化完了');
  }

  /**
   * 補完プロバイダーの登録
   */
  private registerCompletionProvider(): void {
    if (!this.services) {
      return;
    }

    const completionDisposable = vscode.languages.registerCompletionItemProvider(
      [
        { language: 'yaml' },
        { language: 'yaml', scheme: 'file' },
        { language: 'yaml', scheme: 'untitled' }
      ],
      toVscodeCompletionItemProvider(this.services.completionProvider),
      '-', ':', ' ' // トリガー文字を追加
    );
    
    this.disposables.push(completionDisposable);
    this.logger.debug('補完プロバイダーを登録しました');
  }

  /**
   * 設定変更の監視
   */
  private registerSettingsWatcher(): void {
    if (!this.services) {
      return;
    }

    const settingsWatcher = this.services.settingsService.startWatching(() => {
      this.services!.webViewManager.notifyPreviewSettingsChanged();
      // Auto Preview設定の変更は、プレビュー画面の自動表示/非表示のみに影響
      // 既に開かれているプレビュー画面は維持する
      
      // スキーマ関連の設定が変更された場合は再初期化
      const schemaSettings = ConfigManager.getSchemaSettings();
      if (schemaSettings.validationEnabled) {
        this.services!.schemaManager.reinitialize().catch(error => {
          this.logger.error('スキーマの再初期化に失敗しました:', error);
        });
      }
    });
    
    this.disposables.push(settingsWatcher);
    this.logger.debug('設定変更監視を登録しました');
  }

  /**
   * VSCodeテーマ変更の監視
   */
  private registerThemeChangeWatcher(): void {
    if (!this.services) {
      return;
    }

    const themeChangeDisposable = vscode.window.onDidChangeActiveColorTheme(colorTheme => {
      // WebViewにテーマ変更を通知
      const theme = colorTheme.kind === vscode.ColorThemeKind.Light ? 'light' : 'dark';
      this.services!.webViewManager.notifyThemeChange(theme);
    });
    
    this.disposables.push(themeChangeDisposable);
    this.logger.debug('VSCodeテーマ変更監視を登録しました');
  }

  /**
   * VSCode設定変更の監視
   */
  private registerVSCodeSettingsWatcher(): void {
    const settingsDisposable = vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('textui-designer.autoPreview.enabled')) {
        // 設定変更時の処理は既にsettingsWatcherで処理済み
        this.logger.debug('VSCode設定変更を検知しました');
      }
    });
    
    this.disposables.push(settingsDisposable);
    this.logger.debug('VSCode設定変更監視を登録しました');
  }

  /**
   * ドキュメントを開いた時の診断
   */
  registerDocumentOpenHandler(): void {
    if (!this.services) {
      return;
    }

    const documentOpenDisposable = vscode.workspace.onDidOpenTextDocument(document => {
      const diagnosticSettings = ConfigManager.getDiagnosticSettings();
      if (diagnosticSettings.enabled && this.shouldValidateDocument(document.fileName)) {
        this.services!.diagnosticManager.validateAndReportDiagnostics(document);
      }
    });
    
    this.disposables.push(documentOpenDisposable);
    this.logger.debug('ドキュメントオープン監視を登録しました');
  }

  /**
   * 診断対象ファイルかどうかを判定
   */
  private shouldValidateDocument(fileName: string): boolean {
    return getDocumentKind(fileName) !== 'unsupported';
  }

  /**
   * ドキュメントを閉じた時の診断クリア
   */
  registerDocumentCloseHandler(): void {
    if (!this.services) {
      return;
    }

    const documentCloseDisposable = vscode.workspace.onDidCloseTextDocument(document => {
      this.services!.diagnosticManager.clearDiagnosticsForUri(document.uri);
    });
    
    this.disposables.push(documentCloseDisposable);
    this.logger.debug('ドキュメントクローズ監視を登録しました');
  }

  /**
   * カーソル行からコンポーネントインデックスを解決し、
   * WebView に `{ type: 'highlight-component', index }` を postMessage する。
   * アクティブファイルが `.tui.yaml` の場合のみ動作する。
   */
  private registerCursorHighlightHandler(): void {
    const disposable = vscode.window.onDidChangeTextEditorSelection(event => {
      const doc = event.textEditor.document;
      if (!doc.fileName.endsWith('.tui.yaml')) {
        return;
      }
      if (!this.services) {
        return;
      }
      const line = event.selections[0]?.active.line ?? null;
      if (line === null) {
        return;
      }
      const index = cursorLineToComponentIndex(doc.getText(), line);
      this.services.webViewManager.getPanel()?.webview.postMessage({
        type: 'highlight-component',
        index,
      });
    });
    this.disposables.push(disposable);
    this.logger.debug('カーソルハイライトハンドラーを登録しました');
  }

  /**
   * リソースのクリーンアップ
   */
  dispose(): void {
    this.logger.debug('イベントマネージャーのクリーンアップ開始');
    
    // 全disposableを破棄
    this.disposables.forEach(disposable => {
      try {
        disposable.dispose();
      } catch (error) {
        this.logger.error('disposable破棄中にエラーが発生しました:', error);
      }
    });
    
    this.disposables = [];
    this.services = null;
    
    this.logger.debug('イベントマネージャーのクリーンアップ完了');
  }
} 
