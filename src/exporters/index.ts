import * as fs from 'fs';
import * as YAML from 'yaml';
import { ReactExporter } from './react-exporter';
import { PugExporter } from './pug-exporter';
import { HtmlExporter } from './html-exporter';
import type { TextUIDSL } from '../renderer/types';
import { CacheManager } from '../utils/cache-manager';
import { DiffManager } from '../utils/diff-manager';
import { PerformanceMonitor } from '../utils/performance-monitor';
import { ConfigManager } from '../utils/config-manager';

export interface ExportOptions {
  format: 'react' | 'pug' | 'html';
  outputPath?: string;
  fileName?: string;
}

export interface Exporter {
  export(dsl: TextUIDSL, options: ExportOptions): Promise<string>;
  getFileExtension(): string;
}

/**
 * パフォーマンス最適化されたエクスポートマネージャー
 * キャッシュと差分更新を活用して高速化を実現
 */
export class ExportManager {
  private exporters: Map<string, Exporter> = new Map();
  private cacheManager: CacheManager;
  private diffManager: DiffManager;
  private performanceMonitor: PerformanceMonitor;

  constructor() {
    // エクスポーターを初期化
    this.exporters.set('react', new ReactExporter());
    this.exporters.set('pug', new PugExporter());
    this.exporters.set('html', new HtmlExporter());

    // パフォーマンス設定を取得
    const settings = ConfigManager.getPerformanceSettings();
    
    // キャッシュマネージャーを初期化
    this.cacheManager = new CacheManager({
      ttl: settings.cacheTTL,
      maxSize: 100
    });

    // 差分マネージャーを初期化
    this.diffManager = new DiffManager();

    // パフォーマンス監視を初期化
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }

  /**
   * ファイルからエクスポート（最適化版）
   */
  async exportFromFile(filePath: string, options: ExportOptions): Promise<string> {
    return this.performanceMonitor.measureExportTime(async () => {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const dsl = YAML.parse(content) as TextUIDSL;
        
        const exporter = this.exporters.get(options.format);
        if (!exporter) {
          throw new Error(`Unsupported export format: ${options.format}`);
        }

        return await this.exportWithOptimization(dsl, options);
      } catch (error) {
        throw new Error(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  /**
   * 最適化されたエクスポート処理
   */
  private async exportWithOptimization(dsl: TextUIDSL, options: ExportOptions): Promise<string> {
    // 1. キャッシュから取得を試行
    const cachedResult = this.cacheManager.get(dsl, options.format as any);
    if (cachedResult) {
      this.performanceMonitor.recordCacheHit(true);
      return cachedResult;
    }

    this.performanceMonitor.recordCacheHit(false);

    // 2. 差分更新の可能性をチェック
    const diffResult = this.diffManager.computeDiff(dsl);
    
    if (diffResult.hasChanges) {
      // 差分更新の効率を記録
      const totalComponents = dsl.page?.components?.length || 0;
      this.performanceMonitor.recordDiffEfficiency(diffResult.changedComponents.length, totalComponents);
    }

    // 3. 実際のエクスポートを実行
    const exporter = this.exporters.get(options.format);
    if (!exporter) {
      throw new Error(`Unsupported export format: ${options.format}`);
    }

    const result = await exporter.export(dsl, options);

    // 4. 結果をキャッシュに保存
    this.cacheManager.set(dsl, options.format as any, result);

    return result;
  }

  /**
   * 差分更新のみを実行
   */
  async exportWithDiffUpdate(dsl: TextUIDSL, options: ExportOptions): Promise<{
    result: string;
    isFullUpdate: boolean;
    changedComponents: number[];
  }> {
    const diffResult = this.diffManager.computeDiff(dsl);
    
    if (!diffResult.hasChanges) {
      // 変更がない場合はキャッシュから取得
      const cachedResult = this.cacheManager.get(dsl, options.format as any);
      if (cachedResult) {
        this.performanceMonitor.recordCacheHit(true);
        return {
          result: cachedResult,
          isFullUpdate: false,
          changedComponents: []
        };
      }
    }

    // 変更がある場合は完全更新
    const result = await this.exportWithOptimization(dsl, options);
    
    return {
      result,
      isFullUpdate: true,
      changedComponents: diffResult.changedComponents
    };
  }

  /**
   * バッチエクスポート（複数ファイルを効率的に処理）
   */
  async batchExport(files: Array<{ path: string; options: ExportOptions }>): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    const batchStartTime = performance.now();

    // ファイルを並列処理（ただし同時実行数を制限）
    const batchSize = 3; // 同時実行数
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchPromises = batch.map(async ({ path, options }) => {
        try {
          const result = await this.exportFromFile(path, options);
          return { path, result, success: true };
        } catch (error) {
          return { path, error: error instanceof Error ? error.message : String(error), success: false };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      // 結果を収集
      batchResults.forEach(({ path, result, error, success }) => {
        if (success && result) {
          results.set(path, result);
        } else {
          console.error(`Batch export failed for ${path}:`, error);
        }
      });
    }

    const batchDuration = performance.now() - batchStartTime;
    this.performanceMonitor.recordEvent('export', batchDuration, {
      batchSize: files.length,
      successCount: results.size,
      failureCount: files.length - results.size
    });

    return results;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cacheManager.clear();
    this.diffManager.reset();
  }

  /**
   * 特定フォーマットのキャッシュをクリア
   */
  clearFormatCache(format: string): void {
    if (format) {
      this.cacheManager.clearFormat(format as any);
    }
  }

  /**
   * パフォーマンス統計を取得
   */
  getPerformanceStats(): {
    cacheStats: { size: number; maxSize: number; hitRate: number };
    diffStats: { totalChanges: number; changeRate: number; efficiency: number };
    exportMetrics: { renderTime: number; cacheHitRate: number; diffEfficiency: number; memoryUsage: number; totalOperations: number };
  } {
    const cacheStats = this.cacheManager.getStats();
    const exportMetrics = this.performanceMonitor.getMetrics();
    
    // 差分統計は最後の差分結果から計算
    const diffStats = {
      totalChanges: 0,
      changeRate: 0,
      efficiency: 100
    };

    return {
      cacheStats,
      diffStats,
      exportMetrics
    };
  }

  /**
   * パフォーマンスレポートを生成
   */
  generatePerformanceReport(): string {
    const stats = this.getPerformanceStats();
    const report = this.performanceMonitor.generateReport();

    return `
# 最適化エクスポートマネージャー パフォーマンスレポート

${report}

## キャッシュ統計
- キャッシュサイズ: ${stats.cacheStats.size}/${stats.cacheStats.maxSize}
- キャッシュヒット率: ${stats.cacheStats.hitRate.toFixed(1)}%

## 差分更新統計
- 総変更数: ${stats.diffStats.totalChanges}
- 変更率: ${stats.diffStats.changeRate.toFixed(1)}%
- 効率: ${stats.diffStats.efficiency.toFixed(1)}%

## 最適化効果
- 平均レンダリング時間: ${stats.exportMetrics.renderTime.toFixed(2)}ms
- メモリ使用量: ${stats.exportMetrics.memoryUsage.toFixed(2)}MB
- 総操作数: ${stats.exportMetrics.totalOperations}
    `.trim();
  }

  /**
   * サポートされているフォーマットを取得
   */
  getSupportedFormats(): string[] {
    return Array.from(this.exporters.keys());
  }

  /**
   * ファイル拡張子を取得
   */
  getFileExtension(format: string): string {
    const exporter = this.exporters.get(format);
    return exporter ? exporter.getFileExtension() : '';
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    this.cacheManager.clear();
    this.diffManager.reset();
    this.performanceMonitor.dispose();
  }
} 