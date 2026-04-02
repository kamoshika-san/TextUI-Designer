import * as vscode from 'vscode';
import { ExtensionServices } from '../service-initializer';
import { ConfigManager } from '../../utils/config-manager';
import { MemoryMonitor } from '../memory-monitor';
import { Logger } from '../../utils/logger';
import {
  ACTIVE_EDITOR_DEBOUNCE_MS,
  CHANGE_COUNTER_RESET_MS,
  DOCUMENT_DIAGNOSTICS_DEBOUNCE_MS,
  DOCUMENT_PREVIEW_DEBOUNCE_MS,
  FileWatcherSyncState,
  isDocumentOversized,
  MAX_CHANGES_PER_SECOND,
  MAX_DOCUMENT_BYTES,
  MIN_CHANGE_INTERVAL_MS,
  SAVE_DEBOUNCE_MS,
  SAVING_FLAG_CLEAR_DELAY_MS,
  shouldSkipDocumentChangeAfterSave,
  shouldSkipDocumentChangeWhileSaving,
  shouldThrottleByChangeCount,
  shouldThrottleByMinInterval
} from './file-watcher-timing';

export interface FileWatcherDeps {
  logger: Logger;
  getServices: () => ExtensionServices | null;
  memoryMonitor: MemoryMonitor;
  getSyncState: () => FileWatcherSyncState;
  isSupportedFile: (fileName: string) => boolean;
}

/**
 * アクティブエディタ切替の監視とデバウンス（100ms）
 */
export class ActiveEditorSubscription {
  private timeout: NodeJS.Timeout | undefined;

  constructor(
    private readonly deps: FileWatcherDeps,
    private readonly addDisposable: (d: vscode.Disposable) => void
  ) {}

  attach(): void {
    const d = vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor && this.deps.isSupportedFile(editor.document.fileName)) {
        if (this.timeout) {
          clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(() => {
          this.handleActiveEditorChange(editor);
        }, ACTIVE_EDITOR_DEBOUNCE_MS);
      }
    });
    this.addDisposable(d);
  }

  clearTimer(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
  }

  private handleActiveEditorChange(editor: vscode.TextEditor): void {
    const services = this.deps.getServices();
    if (!services) {
      return;
    }

    const previousFile = services.webViewManager.getLastTuiFile();

    if (previousFile !== editor.document.fileName) {
      this.deps.logger.info('ファイルが変更されたため、プレビューを更新します');

      services.webViewManager.setLastTuiFile(editor.document.fileName, true);

      const autoPreviewEnabled = ConfigManager.isAutoPreviewEnabled();
      this.deps.logger.info(
        `アクティブエディタ変更時の設定値: ${autoPreviewEnabled ? 'ON' : 'OFF'}, パネル存在: ${services.webViewManager.hasPanel()}`
      );
      this.deps.logger.info(`ファイル: ${editor.document.fileName}`);
      this.deps.logger.info(`前のファイル: ${previousFile}`);

      if (autoPreviewEnabled) {
        if (!services.webViewManager.hasPanel()) {
          this.deps.logger.info('自動プレビューを開きます');
          services.webViewManager.openPreview();
        }
      }
    } else {
      services.webViewManager.setLastTuiFile(editor.document.fileName);
    }
  }
}

/**
 * ドキュメント保存の監視と診断（デバウンス 100ms + 保存中フラグ）
 */
export class DocumentSaveSubscription {
  private saveTimeout: NodeJS.Timeout | undefined;

  constructor(
    private readonly deps: FileWatcherDeps,
    private readonly addDisposable: (d: vscode.Disposable) => void
  ) {}

  attach(): void {
    const d = vscode.workspace.onDidSaveTextDocument(document => {
      if (this.deps.isSupportedFile(document.fileName)) {
        this.handleDocumentSave(document);
      }
    });
    this.addDisposable(d);
  }

  clearTimer(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = undefined;
    }
  }

  private handleDocumentSave(document: vscode.TextDocument): void {
    const services = this.deps.getServices();
    if (!services) {
      return;
    }

    const state = this.deps.getSyncState();
    const now = Date.now();
    state.lastSaveTime = now;
    state.isSaving = true;

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = undefined;
    }

    this.saveTimeout = setTimeout(() => {
      try {
        const diagnosticSettings = ConfigManager.getDiagnosticSettings();
        if (diagnosticSettings.enabled && diagnosticSettings.validateOnSave) {
          services.diagnosticManager.validateAndReportDiagnostics(document);
        }
      } catch (error) {
        this.deps.logger.error('ドキュメント保存処理でエラーが発生しました:', error);
      } finally {
        setTimeout(() => {
          state.isSaving = false;
        }, SAVING_FLAG_CLEAR_DELAY_MS);
      }
    }, SAVE_DEBOUNCE_MS);
  }
}

/**
 * ドキュメント変更の監視（保存との相互作用・スロットリング・デバウンス 150ms）
 */
export class DocumentChangeSubscription {
  private previewTimeout: NodeJS.Timeout | undefined;
  private diagnosticsTimeout: NodeJS.Timeout | undefined;

  constructor(
    private readonly deps: FileWatcherDeps,
    private readonly addDisposable: (d: vscode.Disposable) => void
  ) {}

  attach(): void {
    const d = vscode.workspace.onDidChangeTextDocument(event => {
      if (this.deps.isSupportedFile(event.document.fileName)) {
        this.handleDocumentChange(event);
      }
    });
    this.addDisposable(d);
  }

  clearTimer(): void {
    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
      this.previewTimeout = undefined;
    }
    if (this.diagnosticsTimeout) {
      clearTimeout(this.diagnosticsTimeout);
      this.diagnosticsTimeout = undefined;
    }
  }

  private handleDocumentChange(event: vscode.TextDocumentChangeEvent): void {
    const services = this.deps.getServices();
    if (!services) {
      return;
    }

    const state = this.deps.getSyncState();
    const now = Date.now();

    if (shouldSkipDocumentChangeAfterSave(now, state.lastSaveTime)) {
      return;
    }

    if (shouldSkipDocumentChangeWhileSaving(state.isSaving)) {
      return;
    }

    state.changeCount++;
    if (shouldThrottleByChangeCount(state.changeCount, MAX_CHANGES_PER_SECOND)) {
      return;
    }

    setTimeout(() => {
      state.changeCount = 0;
    }, CHANGE_COUNTER_RESET_MS);

    if (shouldThrottleByMinInterval(now, state.lastChangeTime, MIN_CHANGE_INTERVAL_MS)) {
      return;
    }
    state.lastChangeTime = now;

    const documentSize = event.document.getText().length;
    if (isDocumentOversized(documentSize, MAX_DOCUMENT_BYTES)) {
      this.deps.logger.info(`ドキュメントサイズが大きすぎます: ${Math.round(documentSize / 1024)}KB`);
      vscode.window.showWarningMessage(
        `ドキュメントサイズが大きすぎます（${Math.round(documentSize / 1024)}KB）。1MB以下にしてください。`
      );
      return;
    }

    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
    }

    this.previewTimeout = setTimeout(async () => {
      try {
        this.deps.memoryMonitor.checkMemoryUsageRealTime();
        services.webViewManager.sendUpdatingSignal();
        await services.webViewManager.updatePreview();
      } catch (error) {
        this.deps.logger.error('ドキュメント変更処理（プレビュー）でエラーが発生しました:', error);
      }
    }, DOCUMENT_PREVIEW_DEBOUNCE_MS);

    if (this.diagnosticsTimeout) {
      clearTimeout(this.diagnosticsTimeout);
    }

    const docSnapshot = event.document;
    this.diagnosticsTimeout = setTimeout(() => {
      try {
        const diagnosticSettings = ConfigManager.getDiagnosticSettings();
        if (diagnosticSettings.enabled && diagnosticSettings.validateOnChange) {
          services.diagnosticManager.validateAndReportDiagnostics(docSnapshot);
        }
      } catch (error) {
        this.deps.logger.error('ドキュメント変更処理（診断）でエラーが発生しました:', error);
      }
    }, DOCUMENT_DIAGNOSTICS_DEBOUNCE_MS);
  }
}
