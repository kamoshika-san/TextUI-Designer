import * as vscode from 'vscode';
import { logger } from '../utils/logger';

/**
 * パフォーマンス追跡サービス
 * 拡張機能のアクティベーション時間を測定
 */
export class PerformanceTracker {
  private activationStartTime: number | null = null;
  private isTracking: boolean = false;

  /**
   * アクティベーション追跡を開始
   */
  startActivation(): void {
    if (this.isTracking) {
      logger.performance('パフォーマンス追跡は既に開始されています');
      return;
    }

    this.activationStartTime = Date.now();
    this.isTracking = true;
    logger.performance('アクティベーション追跡を開始します');
  }

  /**
   * アクティベーション追跡を完了
   */
  completeActivation(): void {
    if (!this.isTracking || this.activationStartTime === null) {
      logger.performance('パフォーマンス追跡が開始されていません');
      return;
    }

    const activationTime = Date.now() - this.activationStartTime;
    this.isTracking = false;
    this.activationStartTime = null;

    logger.performance(`拡張機能のアクティベーション完了: ${activationTime}ms`);
  }

  /**
   * パフォーマンス追跡のクリーンアップ
   */
  dispose(): void {
    this.isTracking = false;
    this.activationStartTime = null;
    logger.performance('パフォーマンス追跡のクリーンアップ');
  }

  /**
   * 追跡状態を取得
   */
  isActive(): boolean {
    return this.isTracking;
  }

  /**
   * 開始時間を取得
   */
  getStartTime(): number | null {
    return this.activationStartTime;
  }
} 