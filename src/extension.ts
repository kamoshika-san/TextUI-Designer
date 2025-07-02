import * as vscode from 'vscode';
import { ExtensionLifecycleManager } from './services/extension-lifecycle-manager';
import { TextUIMemoryTracker } from './utils/textui-memory-tracker';

// グローバル変数としてライフサイクルマネージャーを保存
let lifecycleManager: ExtensionLifecycleManager | undefined;

/**
 * 拡張機能のアクティベーション
 */
export async function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "textui-designer" is now active!');
  console.log('[Extension] アクティベーション開始');

  console.log('TextUI Designer拡張をアクティブ化中...');

  // メモリ追跡システムの初期化
  const memoryTracker = TextUIMemoryTracker.getInstance();
  console.log('[Extension] メモリ追跡システムを初期化しました');

  try {
    // ライフサイクルマネージャーの初期化
    lifecycleManager = new ExtensionLifecycleManager(context);
    
    // 拡張機能のアクティベーション
    await lifecycleManager.activate();
    
    console.log('[Extension] アクティベーション完了');

  } catch (error) {
    console.error('[Extension] アクティベーション中にエラーが発生しました:', error);
    console.error('[Extension] エラー詳細:', error);
    if (error instanceof Error) {
      console.error('[Extension] スタックトレース:', error.stack);
    }
    vscode.window.showErrorMessage(`TextUI Designer拡張の初期化に失敗しました: ${error}`);
    throw error; // エラーを再スローして拡張の起動を失敗させる
  }
}

/**
 * 拡張機能の非アクティベーション
 */
export function deactivate() {
  console.log('TextUI Designer拡張を非アクティブ化中...');

  // メモリ追跡システムのクリーンアップ
  const memoryTracker = TextUIMemoryTracker.getInstance();
  memoryTracker.dispose();
  console.log('[Extension] メモリ追跡システムをクリーンアップしました');

  // ライフサイクルマネージャーのクリーンアップ
  if (lifecycleManager) {
    lifecycleManager.deactivate().catch(error => {
      console.error('[Extension] ライフサイクルマネージャーのクリーンアップに失敗しました:', error);
    });
    lifecycleManager = undefined;
  }

  console.log('TextUI Designer拡張の非アクティベーション完了');
} 