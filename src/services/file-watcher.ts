import * as vscode from 'vscode';
import { ExtensionServices } from './service-initializer';
import { ConfigManager } from '../utils/config-manager';
import { MemoryMonitor } from './memory-monitor';

/**
 * ファイル監視・デバウンス処理
 * ファイル変更、保存、アクティブエディタ変更の監視とデバウンス処理を担当
 */
export class FileWatcher {
  private context: vscode.ExtensionContext;
  private services: ExtensionServices | null = null;
  private disposables: vscode.Disposable[] = [];
  private memoryMonitor: MemoryMonitor;
  
  // デバウンス用タイマー
  private activeEditorTimeout: NodeJS.Timeout | undefined;
  private saveTimeout: NodeJS.Timeout | undefined;
  private documentChangeTimeout: NodeJS.Timeout | undefined;
  
  // 状態管理
  private isSaving = false;
  private lastSaveTime = 0;
  private lastChangeTime = 0;
  private changeCount = 0;
  
  // 定数
  private readonly MIN_CHANGE_INTERVAL = 100;
  private readonly MAX_CHANGES_PER_SECOND = 15;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.memoryMonitor = new MemoryMonitor();
  }

  /**
   * ファイル監視の開始
   */
  startWatching(services: ExtensionServices): void {
    console.log('[FileWatcher] ファイル監視開始');
    
    this.services = services;
    
    // アクティブエディタ変更の監視
    this.watchActiveEditorChange();
    
    // ドキュメント保存の監視
    this.watchDocumentSave();
    
    // ドキュメント変更の監視
    this.watchDocumentChange();
    
    console.log('[FileWatcher] ファイル監視設定完了');
  }

  /**
   * アクティブエディタ変更の監視
   */
  private watchActiveEditorChange(): void {
    const activeEditorDisposable = vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor && this.isWatchedFile(editor.document.fileName)) {
        // 既存のタイマーをクリア
        if (this.activeEditorTimeout) {
          clearTimeout(this.activeEditorTimeout);
        }

        // デバウンス処理（100ms）
        this.activeEditorTimeout = setTimeout(() => {
          if (this.isSupportedFile(editor.document.fileName)) {
            // UIファイルの場合は従来の処理
            this.handleActiveEditorChange(editor);
          } else if (this.isTemplateFile(editor.document.fileName)) {
            // テンプレートファイルの場合は特別な処理は不要（編集のみ）
            console.log(`[FileWatcher] テンプレートファイルを開きました: ${editor.document.fileName}`);
          }
        }, 100);
      }
    });
    
    this.disposables.push(activeEditorDisposable);
  }

  /**
   * ドキュメント保存の監視
   */
  private watchDocumentSave(): void {
    const saveDisposable = vscode.workspace.onDidSaveTextDocument(document => {
      if (this.isWatchedFile(document.fileName)) {
        if (this.isSupportedFile(document.fileName)) {
          // UIファイルの場合は従来の処理
          this.handleDocumentSave(document);
        } else if (this.isTemplateFile(document.fileName)) {
          // テンプレートファイルの場合はキャッシュ無効化
          this.handleTemplateSave(document);
        }
      }
    });
    
    this.disposables.push(saveDisposable);
  }

  /**
   * ドキュメント変更の監視
   */
  private watchDocumentChange(): void {
    const changeDisposable = vscode.workspace.onDidChangeTextDocument(event => {
      if (this.isWatchedFile(event.document.fileName)) {
        if (this.isSupportedFile(event.document.fileName)) {
          // UIファイルの場合は従来の処理
          this.handleDocumentChange(event);
        } else if (this.isTemplateFile(event.document.fileName)) {
          // テンプレートファイルの場合はリアルタイム監視は行わない
          // （保存時のみキャッシュ無効化）
        }
      }
    });
    
    this.disposables.push(changeDisposable);
  }

  /**
   * アクティブエディタ変更の処理
   */
  private handleActiveEditorChange(editor: vscode.TextEditor): void {
    if (!this.services) {return;}

    const previousFile = this.services.webViewManager.getLastTuiFile();
    
    // ファイルが変更された場合は常にプレビューを更新
    if (previousFile !== editor.document.fileName) {
      console.log('[FileWatcher] ファイルが変更されたため、プレビューを更新します');
      
      // ファイル変更時に即座のプレビュー更新を有効にしてsetLastTuiFileを呼び出し
      this.services.webViewManager.setLastTuiFile(editor.document.fileName, true);
      
      // 自動プレビュー設定をチェック
      const autoPreviewEnabled = ConfigManager.isAutoPreviewEnabled();
      console.log(`[FileWatcher] アクティブエディタ変更時の設定値: ${autoPreviewEnabled ? 'ON' : 'OFF'}, パネル存在: ${this.services.webViewManager.hasPanel()}`);
      console.log(`[FileWatcher] ファイル: ${editor.document.fileName}`);
      console.log(`[FileWatcher] 前のファイル: ${previousFile}`);
      
      if (autoPreviewEnabled) {
        if (!this.services.webViewManager.hasPanel()) {
          console.log('[FileWatcher] 自動プレビューを開きます');
          this.services.webViewManager.openPreview();
        }
      }
    } else {
      // ファイルが同じ場合は通常のsetLastTuiFileを呼び出し
      this.services.webViewManager.setLastTuiFile(editor.document.fileName);
    }
  }

  /**
   * ドキュメント保存の処理
   */
  private handleDocumentSave(document: vscode.TextDocument): void {
    if (!this.services) {return;}

    const now = Date.now();
    this.lastSaveTime = now;
    
    // 保存中フラグを設定
    this.isSaving = true;
    
    // 既存のタイマーをクリア
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = undefined;
    }

    // 保存処理をデバウンス（100ms）
    this.saveTimeout = setTimeout(() => {
      try {
        const diagnosticSettings = ConfigManager.getDiagnosticSettings();
        if (diagnosticSettings.enabled && diagnosticSettings.validateOnSave) {
          this.services!.diagnosticManager.validateAndReportDiagnostics(document);
        }
      } catch (error) {
        console.error('[FileWatcher] ドキュメント保存処理でエラーが発生しました:', error);
      } finally {
        // 保存処理完了後、少し遅延してからフラグをリセット
        setTimeout(() => {
          this.isSaving = false;
        }, 500);
      }
    }, 100);
  }

  /**
   * ドキュメント変更の処理
   */
  private handleDocumentChange(event: vscode.TextDocumentChangeEvent): void {
    if (!this.services) {return;}

    const now = Date.now();
    
    // 保存直後（1秒以内）は変更処理をスキップ
    if (now - this.lastSaveTime < 1000) {
      return;
    }
    
    // 保存中は変更処理をスキップ
    if (this.isSaving) {
      return;
    }

    // 変更回数制限をチェック
    this.changeCount++;
    if (this.changeCount > this.MAX_CHANGES_PER_SECOND) {
      return;
    }

    // 1秒後にカウンターをリセット
    setTimeout(() => {
      this.changeCount = 0;
    }, 1000);

    // 最小変更間隔をチェック
    if (now - this.lastChangeTime < this.MIN_CHANGE_INTERVAL) {
      return;
    }
    this.lastChangeTime = now;

    // ドキュメントサイズをチェック
    const documentSize = event.document.getText().length;
    if (documentSize > 1024 * 1024) { // 1MB以上
      console.log(`[FileWatcher] ドキュメントサイズが大きすぎます: ${Math.round(documentSize / 1024)}KB`);
      vscode.window.showWarningMessage(`ドキュメントサイズが大きすぎます（${Math.round(documentSize / 1024)}KB）。1MB以下にしてください。`);
      return;
    }

    // 既存のタイマーをクリア
    if (this.documentChangeTimeout) {
      clearTimeout(this.documentChangeTimeout);
    }

    // デバウンス処理（150ms）
    this.documentChangeTimeout = setTimeout(async () => {
      try {
        // メモリ使用量を段階的に監視
        this.memoryMonitor.checkMemoryUsageRealTime();
        
        // プレビュー画面が開かれている場合は常に更新
        await this.services!.webViewManager.updatePreview();
        
        const diagnosticSettings = ConfigManager.getDiagnosticSettings();
        if (diagnosticSettings.enabled && diagnosticSettings.validateOnChange) {
          this.services!.diagnosticManager.validateAndReportDiagnostics(event.document);
        }
      } catch (error) {
        console.error('[FileWatcher] ドキュメント変更処理でエラーが発生しました:', error);
      }
    }, 150);
  }

  /**
   * テンプレートファイル保存時のキャッシュ無効化処理
   */
  private handleTemplateSave(document: vscode.TextDocument): void {
    if (!this.services) {return;}

    console.log(`[FileWatcher] テンプレートファイルを保存しました: ${document.fileName}`);
    
    try {
      // DiagnosticManager経由でTemplate Parserのキャッシュを無効化
      this.services.diagnosticManager.invalidateTemplateCache(document.fileName);
      
      // テンプレートファイル変更時は、プレビューも更新
      if (this.services.webViewManager.hasPanel()) {
        console.log('[FileWatcher] テンプレートファイル変更によりプレビューを更新します');
        this.services.webViewManager.updatePreview();
      }
    } catch (error) {
      console.error('[FileWatcher] テンプレートファイル保存処理でエラーが発生しました:', error);
    }
  }

  /**
   * サポートされているファイルかチェック
   */
  private isSupportedFile(fileName: string): boolean {
    return fileName.endsWith('.tui.yml') || fileName.endsWith('.tui.yaml');
  }

  /**
   * テンプレートファイルかチェック
   */
  private isTemplateFile(fileName: string): boolean {
    return fileName.endsWith('.template.yml') || fileName.endsWith('.template.yaml');
  }

  /**
   * 監視対象のファイルかチェック（UIファイルまたはテンプレートファイル）
   */
  private isWatchedFile(fileName: string): boolean {
    return this.isSupportedFile(fileName) || this.isTemplateFile(fileName);
  }

  /**
   * ファイル監視の停止
   */
  stopWatching(): void {
    console.log('[FileWatcher] ファイル監視停止');
    
    // タイマーをクリア
    if (this.activeEditorTimeout) {
      clearTimeout(this.activeEditorTimeout);
      this.activeEditorTimeout = undefined;
    }
    
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = undefined;
    }
    
    if (this.documentChangeTimeout) {
      clearTimeout(this.documentChangeTimeout);
      this.documentChangeTimeout = undefined;
    }
    
    // disposableを破棄
    this.disposables.forEach(disposable => {
      try {
        disposable.dispose();
      } catch (error) {
        console.error('[FileWatcher] disposable破棄中にエラーが発生しました:', error);
      }
    });
    
    this.disposables = [];
    this.services = null;
  }
} 