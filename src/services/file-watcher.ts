import * as vscode from 'vscode';
import { ExtensionServices } from './service-initializer';
import { ConfigManager } from '../utils/config-manager';
import { MemoryMonitor } from './memory-monitor';
import { ErrorHandler } from '../utils/error-handler';

/**
 * ファイル監視・デバウンス処理
 * ファイル変更、保存、アクティブエディタ変更の監視とデバウンス処理を担当
 */
export class FileWatcher {
  private context: vscode.ExtensionContext;
  private services: ExtensionServices | null = null;
  private disposables: vscode.Disposable[] = [];
  private memoryMonitor: MemoryMonitor;
  private watcher: vscode.FileSystemWatcher | null = null;
  private editorChangeDisposable: vscode.Disposable | null = null;
  private documentSaveDisposable: vscode.Disposable | null = null;

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
    this.stopWatching();
    
    // ワークスペースフォルダを監視
    if (vscode.workspace.workspaceFolders) {
      for (const folder of vscode.workspace.workspaceFolders) {
        const pattern = new vscode.RelativePattern(folder, '**/*.tui.{yml,yaml}');
        this.watcher = vscode.workspace.createFileSystemWatcher(pattern);
        
        this.watcher.onDidChange(this.handleFileChange.bind(this));
        this.watcher.onDidCreate(this.handleFileChange.bind(this));
        this.watcher.onDidDelete(this.handleFileDelete.bind(this));
      }
    }
    
    // エディタ変更の監視
    this.editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(
      this.handleEditorChange.bind(this)
    );
    
    // ドキュメント保存の監視
    this.documentSaveDisposable = vscode.workspace.onDidSaveTextDocument(
      this.handleDocumentSave.bind(this)
    );
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
      // ファイル変更時に即座のプレビュー更新を有効にしてsetLastTuiFileを呼び出し
      this.services.webViewManager.setLastTuiFile(editor.document.fileName, true);
      
      // 自動プレビュー設定をチェック
      const autoPreviewEnabled = ConfigManager.isAutoPreviewEnabled();
      
      if (autoPreviewEnabled) {
        if (!this.services.webViewManager.hasPanel()) {
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
    this.isSaving = true;
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = undefined;
    }
    this.saveTimeout = setTimeout(() => {
      ErrorHandler.withErrorHandling(async () => {
        const diagnosticSettings = ConfigManager.getDiagnosticSettings();
        if (diagnosticSettings.enabled && diagnosticSettings.validateOnSave) {
          await this.services!.diagnosticManager.validateAndReportDiagnostics(document);
        }
      }, 'FileWatcher: ドキュメント保存処理').finally(() => {
        setTimeout(() => { this.isSaving = false; }, 500);
      });
    }, 100);
  }

  /**
   * ドキュメント変更の処理
   */
  private handleDocumentChange(event: vscode.TextDocumentChangeEvent): void {
    if (!this.services) {return;}
    const now = Date.now();
    if (now - this.lastSaveTime < 1000) return;
    if (this.isSaving) return;
    this.changeCount++;
    if (this.changeCount > this.MAX_CHANGES_PER_SECOND) return;
    setTimeout(() => { this.changeCount = 0; }, 1000);
    if (now - this.lastChangeTime < this.MIN_CHANGE_INTERVAL) return;
    this.lastChangeTime = now;
    const documentSize = event.document.getText().length;
    if (documentSize > 1024 * 1024) {
      vscode.window.showWarningMessage(`ドキュメントサイズが大きすぎます（${Math.round(documentSize / 1024)}KB）。1MB以下にしてください。`);
      return;
    }
    if (this.documentChangeTimeout) {
      clearTimeout(this.documentChangeTimeout);
    }
    this.documentChangeTimeout = setTimeout(() => {
      ErrorHandler.withErrorHandling(async () => {
        this.memoryMonitor.checkMemoryUsageRealTime();
        await this.services!.webViewManager.updatePreview();
        const diagnosticSettings = ConfigManager.getDiagnosticSettings();
        if (diagnosticSettings.enabled && diagnosticSettings.validateOnChange) {
          await this.services!.diagnosticManager.validateAndReportDiagnostics(event.document);
        }
      }, 'FileWatcher: ドキュメント変更処理');
    }, 150);
  }

  /**
   * テンプレートファイル保存時のキャッシュ無効化処理
   */
  private handleTemplateSave(document: vscode.TextDocument): void {
    if (!this.services) {return;}
    ErrorHandler.withErrorHandling(async () => {
      this.services!.diagnosticManager.invalidateTemplateCache(document.fileName);
      if (this.services!.webViewManager.hasPanel()) {
        await this.services!.webViewManager.updatePreview();
      }
    }, 'FileWatcher: テンプレートファイル保存処理');
  }

  /**
   * ファイル変更の処理
   */
  private handleFileChange(uri: vscode.Uri): void {
    // ファイル変更時の処理
  }

  /**
   * ファイル削除の処理
   */
  private handleFileDelete(uri: vscode.Uri): void {
    // ファイル削除時の処理
  }

  /**
   * エディタ変更の処理
   */
  private handleEditorChange(editor: vscode.TextEditor | undefined): void {
    if (editor && this.isWatchedFile(editor.document.fileName)) {
      this.handleActiveEditorChange(editor);
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