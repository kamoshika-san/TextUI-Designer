import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';
import { ErrorHandler } from './error-handler';

/**
 * キャッシュエントリの基本インターフェース
 */
export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  size: number;
  key: string;
  metadata?: Record<string, unknown>;
}

/**
 * キャッシュ統計情報
 */
export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  invalidations: number;
  memoryUsage: number;
}

/**
 * キャッシュ設定
 */
export interface CacheConfig {
  maxCacheSize: number; // MB
  maxEntries: number;
  maxAge: number; // ミリ秒
  cleanupInterval: number; // ミリ秒
  memoryPressureThreshold: number; // MB
}

/**
 * キャッシュカテゴリー
 */
export enum CacheCategory {
  TEMPLATE = 'template',
  SCHEMA = 'schema',
  YAML = 'yaml',
  DIAGNOSTICS = 'diagnostics',
  RENDER = 'render',
  WEBVIEW = 'webview'
}

/**
 * 統一キャッシュ管理システム
 * 全キャッシュ機能を統合し、DRY原則に従った実装
 */
export class UnifiedCacheManager {
  private static instance: UnifiedCacheManager;
  private caches = new Map<CacheCategory, Map<string, CacheEntry>>();
  private stats = new Map<CacheCategory, CacheStats>();
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;

  private constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxCacheSize: 50, // 50MB
      maxEntries: 1000,
      maxAge: 30 * 60 * 1000, // 30分
      cleanupInterval: 5 * 60 * 1000, // 5分
      memoryPressureThreshold: 100, // 100MB
      ...config
    };

    this.initializeCaches();
    this.startCleanupTimer();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(config?: Partial<CacheConfig>): UnifiedCacheManager {
    if (!UnifiedCacheManager.instance) {
      UnifiedCacheManager.instance = new UnifiedCacheManager(config);
    }
    return UnifiedCacheManager.instance;
  }

  /**
   * キャッシュを初期化
   */
  private initializeCaches(): void {
    Object.values(CacheCategory).forEach(category => {
      this.caches.set(category, new Map());
      this.stats.set(category, {
        totalEntries: 0,
        totalSize: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
        invalidations: 0,
        memoryUsage: 0
      });
    });
  }

  /**
   * キャッシュに値を設定
   */
  set<T>(category: CacheCategory, key: string, data: T, metadata?: Record<string, unknown>): void {
    const cache = this.caches.get(category);
    const stats = this.stats.get(category);
    
    if (!cache || !stats) {
      logger.error(`無効なキャッシュカテゴリー: ${category}`);
      return;
    }

    const size = this.calculateSize(data);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      size,
      key,
      metadata
    };

    cache.set(key, entry);
    stats.totalEntries = cache.size;
    stats.totalSize += size;

    logger.debug(`キャッシュ設定: ${category}:${key} (サイズ: ${(size / 1024).toFixed(1)}KB)`);
  }

  /**
   * キャッシュから値を取得
   */
  get<T>(category: CacheCategory, key: string): T | null {
    const cache = this.caches.get(category);
    const stats = this.stats.get(category);
    
    if (!cache || !stats) {
      logger.error(`無効なキャッシュカテゴリー: ${category}`);
      return null;
    }

    const entry = cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      stats.misses++;
      this.updateHitRate(category);
      return null;
    }

    // 有効期限チェック
    if (Date.now() - entry.timestamp > this.config.maxAge) {
      this.invalidate(category, key);
      stats.misses++;
      this.updateHitRate(category);
      return null;
    }

    stats.hits++;
    this.updateHitRate(category);
    
    logger.debug(`キャッシュヒット: ${category}:${key}`);
    return entry.data;
  }

  /**
   * キャッシュから値を削除
   */
  invalidate(category: CacheCategory, key: string): void {
    const cache = this.caches.get(category);
    const stats = this.stats.get(category);
    
    if (!cache || !stats) {
      return;
    }

    const entry = cache.get(key);
    if (entry) {
      stats.totalSize -= entry.size;
      stats.invalidations++;
      cache.delete(key);
      stats.totalEntries = cache.size;
      
      logger.debug(`キャッシュ無効化: ${category}:${key}`);
    }
  }

  /**
   * カテゴリー全体のキャッシュをクリア
   */
  clearCategory(category: CacheCategory): void {
    const cache = this.caches.get(category);
    const stats = this.stats.get(category);
    
    if (!cache || !stats) {
      return;
    }

    const entryCount = cache.size;
    cache.clear();
    stats.totalEntries = 0;
    stats.totalSize = 0;
    stats.invalidations += entryCount;
    
    logger.info(`キャッシュカテゴリークリア: ${category} (${entryCount}エントリ)`);
  }

  /**
   * 全キャッシュをクリア
   */
  clear(): void {
    this.caches.forEach((cache, category) => {
      const stats = this.stats.get(category);
      if (stats) {
        stats.totalEntries = 0;
        stats.totalSize = 0;
        stats.invalidations += cache.size;
      }
      cache.clear();
    });
    
    logger.info('全キャッシュをクリアしました');
  }

  /**
   * キャッシュ統計を取得
   */
  getStats(category?: CacheCategory): CacheStats | Record<CacheCategory, CacheStats> {
    if (category) {
      return this.stats.get(category) || this.createEmptyStats();
    }
    
    const result: Record<CacheCategory, CacheStats> = {} as Record<CacheCategory, CacheStats>;
    Object.values(CacheCategory).forEach(cat => {
      result[cat] = this.stats.get(cat) || this.createEmptyStats();
    });
    
    return result;
  }

  /**
   * 空の統計オブジェクトを作成
   */
  private createEmptyStats(): CacheStats {
    return {
      totalEntries: 0,
      totalSize: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      invalidations: 0,
      memoryUsage: 0
    };
  }

  /**
   * ヒット率を更新
   */
  private updateHitRate(category: CacheCategory): void {
    const stats = this.stats.get(category);
    if (!stats) return;
    
    const total = stats.hits + stats.misses;
    stats.hitRate = total > 0 ? (stats.hits / total) * 100 : 0;
  }

  /**
   * データサイズを計算
   */
  private calculateSize(data: unknown): number {
    try {
      return Buffer.byteLength(JSON.stringify(data), 'utf-8');
    } catch {
      return 0;
    }
  }

  /**
   * メモリ圧迫チェック
   */
  private async checkMemoryPressure(): Promise<void> {
    const totalSize = Array.from(this.stats.values())
      .reduce((sum, stats) => sum + stats.totalSize, 0);
    
    const totalSizeMB = totalSize / (1024 * 1024);
    
    if (totalSizeMB > this.config.memoryPressureThreshold) {
      logger.warn(`メモリ圧迫検出: ${totalSizeMB.toFixed(1)}MB > ${this.config.memoryPressureThreshold}MB`);
      await this.performAggressiveCleanup();
    }
  }

  /**
   * 積極的なクリーンアップ
   */
  private async performAggressiveCleanup(): Promise<void> {
    const targetSize = this.config.maxCacheSize * 0.5; // 50%まで削減
    
    // 全カテゴリーのエントリを時系列でソート
    const allEntries: Array<{ category: CacheCategory; key: string; entry: CacheEntry }> = [];
    
    this.caches.forEach((cache, category) => {
      cache.forEach((entry, key) => {
        allEntries.push({ category, key, entry });
      });
    });
    
    // 古い順にソート
    allEntries.sort((a, b) => a.entry.timestamp - b.entry.timestamp);
    
    // 古いエントリから削除
    let currentSize = Array.from(this.stats.values())
      .reduce((sum, stats) => sum + stats.totalSize, 0);
    
    for (const { category, key } of allEntries) {
      if (currentSize <= targetSize * 1024 * 1024) break;
      
      const entry = this.caches.get(category)?.get(key);
      if (entry) {
        currentSize -= entry.size;
        this.invalidate(category, key);
      }
    }
    
    logger.info(`積極的クリーンアップ完了: ${(currentSize / (1024 * 1024)).toFixed(1)}MB`);
  }

  /**
   * 定期クリーンアップ
   */
  private performScheduledCleanup(): void {
    const now = Date.now();
    
    this.caches.forEach((cache, category) => {
      const toRemove: string[] = [];
      
      cache.forEach((entry, key) => {
        if (now - entry.timestamp > this.config.maxAge) {
          toRemove.push(key);
        }
      });
      
      toRemove.forEach(key => this.invalidate(category, key));
    });
    
    this.checkMemoryPressure();
  }

  /**
   * クリーンアップタイマーを開始
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performScheduledCleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * リソースを破棄
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    
    this.clear();
    this.caches.clear();
    this.stats.clear();
  }

  /**
   * 設定を更新
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('キャッシュ設定を更新しました');
  }

  /**
   * キャッシュの状態を取得
   */
  getStatus(): {
    totalEntries: number;
    totalSize: number;
    categories: number;
    config: CacheConfig;
  } {
    const totalEntries = Array.from(this.stats.values())
      .reduce((sum, stats) => sum + stats.totalEntries, 0);
    
    const totalSize = Array.from(this.stats.values())
      .reduce((sum, stats) => sum + stats.totalSize, 0);
    
    return {
      totalEntries,
      totalSize,
      categories: this.caches.size,
      config: this.config
    };
  }
}