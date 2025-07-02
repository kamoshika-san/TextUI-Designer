import * as vscode from 'vscode';
import { ConfigManager } from './config-manager';

export interface TextUIMemoryMetrics {
  webviewMemory: number; // WebView関連メモリ使用量 (MB)
  yamlCacheMemory: number; // YAML解析キャッシュメモリ使用量 (MB)
  diagnosticsMemory: number; // 診断システムメモリ使用量 (MB)
  renderCacheMemory: number; // レンダリングキャッシュメモリ使用量 (MB)
  totalTrackedMemory: number; // 追跡対象メモリ総量 (MB)
  lastMeasured: number; // 最後の測定時刻
}

export interface MemoryTrackedObject {
  id: string;
  type: 'webview' | 'yaml-cache' | 'diagnostics' | 'render-cache';
  size: number; // バイト単位
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * TextUI Designer専用のメモリ追跡システム
 * WeakMapを使用してメモリリークを防止し、低オーバーヘッドでメモリ使用量を追跡
 */
export class TextUIMemoryTracker {
  private static instance: TextUIMemoryTracker;
  
  // WeakMapを使用してメモリリークを防止
  private webviewObjects = new WeakMap<object, MemoryTrackedObject>();
  private yamlCacheObjects = new WeakMap<object, MemoryTrackedObject>();
  private diagnosticsObjects = new WeakMap<object, MemoryTrackedObject>();
  private renderCacheObjects = new WeakMap<object, MemoryTrackedObject>();
  
  // 集計データ（定期的に更新）
  private metrics: TextUIMemoryMetrics = {
    webviewMemory: 0,
    yamlCacheMemory: 0,
    diagnosticsMemory: 0,
    renderCacheMemory: 0,
    totalTrackedMemory: 0,
    lastMeasured: 0
  };
  
  // 追跡対象オブジェクトの参照を保持（WeakMapの制約回避用）
  private trackedObjects = new Set<WeakRef<object>>();
  
  private isEnabled: boolean;
  private measurementInterval: NodeJS.Timeout | null = null;
  private readonly MEASUREMENT_INTERVAL = 5000; // 5秒間隔で測定
  private readonly CLEANUP_INTERVAL = 30000; // 30秒間隔でクリーンアップ
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // パフォーマンス監視
  private measurementStartTime = 0;
  private measurementOverhead = 0;

  private constructor() {
    const settings = ConfigManager.getPerformanceSettings();
    this.isEnabled = settings.enableMemoryTracking || false;
    
    if (this.isEnabled) {
      this.startMeasurementInterval();
      this.startCleanupInterval();
      console.log('[TextUIMemoryTracker] メモリ追跡システムが初期化されました');
    } else {
      console.log('[TextUIMemoryTracker] メモリ追跡が無効です。設定で有効化してください。');
    }
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
    if (!this.isEnabled) { return; }
    
    this.trackObject(obj, 'webview', size, metadata);
  }

  /**
   * YAML解析キャッシュオブジェクトの追跡を開始
   */
  trackYamlCacheObject(obj: object, size: number, metadata?: Record<string, any>): void {
    if (!this.isEnabled) { return; }
    
    this.trackObject(obj, 'yaml-cache', size, metadata);
  }

  /**
   * 診断システムオブジェクトの追跡を開始
   */
  trackDiagnosticsObject(obj: object, size: number, metadata?: Record<string, any>): void {
    if (!this.isEnabled) { return; }
    
    this.trackObject(obj, 'diagnostics', size, metadata);
  }

  /**
   * レンダリングキャッシュオブジェクトの追跡を開始
   */
  trackRenderCacheObject(obj: object, size: number, metadata?: Record<string, any>): void {
    if (!this.isEnabled) { return; }
    
    this.trackObject(obj, 'render-cache', size, metadata);
  }

  /**
   * 汎用的なオブジェクト追跡メソッド
   */
  private trackObject(
    obj: object, 
    type: MemoryTrackedObject['type'], 
    size: number, 
    metadata?: Record<string, any>
  ): void {
    const trackedObj: MemoryTrackedObject = {
      id: this.generateObjectId(obj),
      type,
      size,
      timestamp: Date.now(),
      metadata
    };

    // 適切なWeakMapに追加
    switch (type) {
      case 'webview':
        this.webviewObjects.set(obj, trackedObj);
        break;
      case 'yaml-cache':
        this.yamlCacheObjects.set(obj, trackedObj);
        break;
      case 'diagnostics':
        this.diagnosticsObjects.set(obj, trackedObj);
        break;
      case 'render-cache':
        this.renderCacheObjects.set(obj, trackedObj);
        break;
    }

    // WeakRefで参照を保持
    this.trackedObjects.add(new WeakRef(obj));
    
    // 開発モードでログ出力
    if (this.isDevelopmentMode()) {
      console.log(`[TextUIMemoryTracker] ${type}オブジェクトを追跡開始: ${size}バイト`);
    }
  }

  /**
   * オブジェクトの一意IDを生成
   */
  private generateObjectId(obj: object): string {
    return `${obj.constructor.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * メモリ使用量を測定してメトリクスを更新
   */
  private async measureMemoryUsage(): Promise<void> {
    if (!this.isEnabled) { return; }

    this.measurementStartTime = performance.now();

    try {
      // 各カテゴリのメモリ使用量を計算
      const webviewMemory = this.calculateCategoryMemory(this.webviewObjects);
      const yamlCacheMemory = this.calculateCategoryMemory(this.yamlCacheObjects);
      const diagnosticsMemory = this.calculateCategoryMemory(this.diagnosticsObjects);
      const renderCacheMemory = this.calculateCategoryMemory(this.renderCacheObjects);

      this.metrics = {
        webviewMemory,
        yamlCacheMemory,
        diagnosticsMemory,
        renderCacheMemory,
        totalTrackedMemory: webviewMemory + yamlCacheMemory + diagnosticsMemory + renderCacheMemory,
        lastMeasured: Date.now()
      };

      // パフォーマンスオーバーヘッドを計算
      this.measurementOverhead = performance.now() - this.measurementStartTime;

      if (this.isDevelopmentMode()) {
        console.log('[TextUIMemoryTracker] メモリ測定完了:', this.metrics);
        console.log(`[TextUIMemoryTracker] 測定オーバーヘッド: ${this.measurementOverhead.toFixed(2)}ms`);
      }
    } catch (error) {
      console.error('[TextUIMemoryTracker] メモリ測定エラー:', error);
    }
  }

  /**
   * 特定カテゴリのメモリ使用量を計算
   */
  private calculateCategoryMemory(weakMap: WeakMap<object, MemoryTrackedObject>): number {
    let totalSize = 0;
    let validObjects = 0;

    // WeakRefで保持している参照をチェック
    for (const ref of this.trackedObjects) {
      const obj = ref.deref();
      if (obj && weakMap.has(obj)) {
        const tracked = weakMap.get(obj);
        if (tracked) {
          totalSize += tracked.size;
          validObjects++;
        }
      }
    }

    return totalSize / (1024 * 1024); // MB単位に変換
  }

  /**
   * 現在のメモリメトリクスを取得
   */
  getMetrics(): TextUIMemoryMetrics {
    return { ...this.metrics };
  }

  /**
   * 詳細なメモリレポートを生成
   */
  generateMemoryReport(): string {
    const metrics = this.getMetrics();
    const overhead = this.getMeasurementOverhead();

    return `
=== TextUI Designer メモリ使用状況レポート ===
最終測定: ${new Date(metrics.lastMeasured).toLocaleString()}

▼ カテゴリ別メモリ使用量:
  WebView関連:      ${metrics.webviewMemory.toFixed(2)} MB
  YAML解析キャッシュ: ${metrics.yamlCacheMemory.toFixed(2)} MB
  診断システム:      ${metrics.diagnosticsMemory.toFixed(2)} MB
  レンダリングキャッシュ: ${metrics.renderCacheMemory.toFixed(2)} MB
  
▼ 総計:
  追跡対象総メモリ:   ${metrics.totalTrackedMemory.toFixed(2)} MB

▼ パフォーマンス:
  測定オーバーヘッド:  ${overhead.toFixed(2)}ms
  オーバーヘッド率:    ${this.calculateOverheadPercentage().toFixed(2)}%

${this.generateMemoryRecommendations(metrics)}
`;
  }

  /**
   * メモリ最適化の推奨事項を生成
   */
  private generateMemoryRecommendations(metrics: TextUIMemoryMetrics): string {
    const recommendations: string[] = [];

    if (metrics.webviewMemory > 10) {
      recommendations.push('• WebViewメモリが高めです。プレビューを一時的に閉じることを検討してください');
    }

    if (metrics.yamlCacheMemory > 5) {
      recommendations.push('• YAMLキャッシュサイズが大きいです。キャッシュクリアを実行してください');
    }

    if (metrics.renderCacheMemory > 8) {
      recommendations.push('• レンダリングキャッシュが大きいです。キャッシュ設定の見直しを推奨します');
    }

    if (metrics.totalTrackedMemory > 25) {
      recommendations.push('• 総メモリ使用量が多めです。不要なファイルを閉じて拡張機能を再起動してください');
    }

    if (recommendations.length === 0) {
      recommendations.push('• メモリ使用量は正常範囲内です');
    }

    return '\n▼ 推奨事項:\n' + recommendations.join('\n');
  }

  /**
   * 測定オーバーヘッドを取得
   */
  getMeasurementOverhead(): number {
    return this.measurementOverhead;
  }

  /**
   * オーバーヘッド率を計算（5%未満を目標）
   */
  private calculateOverheadPercentage(): number {
    // 5秒間隔での測定なので、オーバーヘッド率 = (測定時間 / 測定間隔) * 100
    return (this.measurementOverhead / this.MEASUREMENT_INTERVAL) * 100;
  }

  /**
   * 定期的なメモリ測定を開始
   */
  private startMeasurementInterval(): void {
    this.measurementInterval = setInterval(async () => {
      await this.measureMemoryUsage();
    }, this.MEASUREMENT_INTERVAL);
  }

  /**
   * 定期的なクリーンアップを開始
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupDeadReferences();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * ガベージコレクションされたオブジェクトの参照をクリーンアップ
   */
  private cleanupDeadReferences(): void {
    const initialSize = this.trackedObjects.size;
    const validRefs = new Set<WeakRef<object>>();

    for (const ref of this.trackedObjects) {
      if (ref.deref() !== undefined) {
        validRefs.add(ref);
      }
    }

    this.trackedObjects = validRefs;

    if (this.isDevelopmentMode()) {
      const cleanedCount = initialSize - this.trackedObjects.size;
      if (cleanedCount > 0) {
        console.log(`[TextUIMemoryTracker] ${cleanedCount}個の無効な参照をクリーンアップしました`);
      }
    }
  }

  /**
   * メモリ追跡を有効/無効にする
   */
  setEnabled(enabled: boolean): void {
    if (this.isEnabled === enabled) { return; }

    this.isEnabled = enabled;

    if (enabled) {
      this.startMeasurementInterval();
      this.startCleanupInterval();
      console.log('[TextUIMemoryTracker] メモリ追跡を有効にしました');
    } else {
      this.dispose();
      console.log('[TextUIMemoryTracker] メモリ追跡を無効にしました');
    }
  }

  /**
   * 開発モードかどうかを判定
   */
  private isDevelopmentMode(): boolean {
    return process.env.NODE_ENV === 'development' || 
           vscode.workspace.getConfiguration('textui-designer').get('debug.enableVerboseLogging', false);
  }

  /**
   * リソースをクリーンアップして追跡を停止
   */
  dispose(): void {
    if (this.measurementInterval) {
      clearInterval(this.measurementInterval);
      this.measurementInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.trackedObjects.clear();
    console.log('[TextUIMemoryTracker] リソースをクリーンアップしました');
  }

  /**
   * テスト用: メトリクスを強制設定
   */
  _setTestMetrics(metrics: Partial<TextUIMemoryMetrics>): void {
    this.metrics = { ...this.metrics, ...metrics };
  }

  /**
   * テスト用: 手動でメモリ測定を実行
   */
  async _measureMemoryForTest(): Promise<void> {
    await this.measureMemoryUsage();
  }
} 