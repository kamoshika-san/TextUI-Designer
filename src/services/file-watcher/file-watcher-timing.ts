/**
 * FileWatcher のデバウンス・スロットリング定数と、ドキュメント変更経路の分岐（純粋関数）。
 * タイマーは FileWatcher / 購読クラス側に置き、ここでは条件判定のみを集約する。
 */

export const ACTIVE_EDITOR_DEBOUNCE_MS = 100;
export const SAVE_DEBOUNCE_MS = 100;
export const SAVING_FLAG_CLEAR_DELAY_MS = 500;
export const POST_SAVE_DOCUMENT_CHANGE_SKIP_MS = 1000;
/** プレビュー更新（latest-wins・短め） */
export const DOCUMENT_PREVIEW_DEBOUNCE_MS = 100;
/** 診断（validateOnChange）。プレビューと独立したタイマーで相互にブロックしない（T-308） */
export const DOCUMENT_DIAGNOSTICS_DEBOUNCE_MS = 350;
/** @deprecated DOCUMENT_PREVIEW_DEBOUNCE_MS に置き換え */
export const DOCUMENT_CHANGE_DEBOUNCE_MS = DOCUMENT_PREVIEW_DEBOUNCE_MS;
export const CHANGE_COUNTER_RESET_MS = 1000;
export const MIN_CHANGE_INTERVAL_MS = 100;
export const MAX_CHANGES_PER_SECOND = 15;
export const MAX_DOCUMENT_BYTES = 1024 * 1024;

/** 保存・変更の相互作用で共有する可変状態（購読クラスから参照） */
export class FileWatcherSyncState {
  isSaving = false;
  lastSaveTime = 0;
  lastChangeTime = 0;
  changeCount = 0;
}

export function shouldSkipDocumentChangeAfterSave(now: number, lastSaveTime: number): boolean {
  return now - lastSaveTime < POST_SAVE_DOCUMENT_CHANGE_SKIP_MS;
}

export function shouldSkipDocumentChangeWhileSaving(isSaving: boolean): boolean {
  return isSaving;
}

export function shouldThrottleByChangeCount(changeCount: number, maxPerSecond: number): boolean {
  return changeCount > maxPerSecond;
}

export function shouldThrottleByMinInterval(now: number, lastChangeTime: number, minMs: number): boolean {
  return now - lastChangeTime < minMs;
}

export function isDocumentOversized(documentByteLength: number, maxBytes: number): boolean {
  return documentByteLength > maxBytes;
}
