import * as vscode from 'vscode';
import { ConfigManager } from './config-manager';
import { 
  OptimizedMemoryTracker, 
  OptimizedMemoryMetrics, 
  MemoryReport,
  MemoryCategoryType 
} from './memory-tracker/index';

/**
 * TextUI Designer専用のメモリ追跡システム（最適化済み）
 * 
 * @deprecated 直接OptimizedMemoryTrackerを使用することを推奨
 */
export class TextUIMemoryTracker {
  private static instance: TextUIMemoryTracker;
  private optimizedTracker: OptimizedMemoryTracker;

  private constructor() {
    this.optimizedTracker = OptimizedMemoryTracker.getInstance();
    
    // 互換性のためのメッセージ
    console.log('[TextUIMemoryTracker] 最適化されたメモリ追跡システムを使用しています');
  }

  static getInstance(): TextUIMemoryTracker {
    if (!TextUIMemoryTracker.instance) {
      TextUIMemoryTracker.instance = new TextUIMemoryTracker();
    }
    return TextUIMemoryTracker.instance;
  }

  /**
   * WebView関連オブジェクトの追跡を開始
   */
  trackWebviewObject(obj: object, size: number, metadata?: Record<string, any>): void {
    const id = this.generateObjectId(obj);
    this.optimizedTracker.trackObject('webview', id, size, metadata);
  }

  /**
   * YAML解析キャッシュオブジェクトの追跡を開始
   */
  trackYamlCacheObject(obj: object, size: number, metadata?: Record<string, any>): void {
    const id = this.generateObjectId(obj);
    this.optimizedTracker.trackObject('yaml-cache', id, size, metadata);
  }

  /**
   * 診断システムオブジェクトの追跡を開始
   */
  trackDiagnosticsObject(obj: object, size: number, metadata?: Record<string, any>): void {
    const id = this.generateObjectId(obj);
    this.optimizedTracker.trackObject('diagnostics', id, size, metadata);
  }

  /**
   * レンダリングキャッシュオブジェクトの追跡を開始
   */
  trackRenderCacheObject(obj: object, size: number, metadata?: Record<string, any>): void {
    const id = this.generateObjectId(obj);
    this.optimizedTracker.trackObject('render-cache', id, size, metadata);
  }

  /**
   * オブジェクトの一意IDを生成
   */
  private generateObjectId(obj: object): string {
    return `${obj.constructor.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * メモリメトリクスを取得
   */
  getMetrics(): OptimizedMemoryMetrics {
    return this.optimizedTracker.getMetrics();
  }

  /**
   * メモリレポートを生成
   */
  generateMemoryReport(): MemoryReport {
    return this.optimizedTracker.generateMemoryReport();
  }

  /**
   * 測定オーバーヘッドを取得
   */
  getMeasurementOverhead(): number {
    const metrics = this.optimizedTracker.getMetrics();
    return metrics.measurementOverhead;
  }

  /**
   * メモリ追跡の有効/無効を設定
   */
  setEnabled(enabled: boolean): void {
    this.optimizedTracker.setEnabled(enabled);
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    this.optimizedTracker.dispose();
  }

  /**
   * テスト用メソッド
   */
  _setTestMetrics(metrics: Partial<OptimizedMemoryMetrics>): void {
    // テスト用の実装（最適化版では直接サポート）
  }

  /**
   * テスト用メモリ測定
   */
  async _measureMemoryForTest(): Promise<void> {
    await this.optimizedTracker._measureMemoryForTest();
  }
}

// 型エイリアス（後方互換性のため）
export type TextUIMemoryMetrics = OptimizedMemoryMetrics; 