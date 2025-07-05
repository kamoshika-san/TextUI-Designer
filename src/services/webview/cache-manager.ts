import { PerformanceMonitor } from '../../utils/performance-monitor';
import { ICacheManagerTest } from '../../types';

export interface CacheEntry {
  content: string;
  data: any;
  fileName: string;
  timestamp: number;
  size: number;
}

/**
 * キャッシュ管理専用クラス
 * YAMLコンテンツのキャッシュ、メモリ管理、キャッシュヒット率の追跡を担当
 */
export class CacheManager implements ICacheManagerTest {
  private cache: Map<string, CacheEntry> = new Map();
  private performanceMonitor: PerformanceMonitor;
  private readonly MAX_CACHE_SIZE: number = 50 * 1024 * 1024; // 50MB制限
  private readonly MAX_CACHE_ENTRIES: number = 100; // 最大エントリ数
  private currentCacheSize: number = 0;

  constructor() {
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }

  /**
   * キャッシュからデータを取得
   */
  getCachedData(fileName: string, content: string): any | null {
    const cacheKey = this.generateCacheKey(fileName, content);
    const entry = this.cache.get(cacheKey);

    if (entry) {
      console.log(`[CacheManager] キャッシュヒット: ${fileName}`);
      this.performanceMonitor.recordCacheHit(true);
      return entry.data;
    }

    console.log(`[CacheManager] キャッシュミス: ${fileName}`);
    this.performanceMonitor.recordCacheHit(false);
    return null;
  }

  /**
   * データをキャッシュに保存
   */
  setCachedData(fileName: string, content: string, data: any): void {
    const cacheKey = this.generateCacheKey(fileName, content);
    const entrySize = this.calculateEntrySize(content, data);

    // キャッシュサイズ制限をチェック
    if (this.currentCacheSize + entrySize > this.MAX_CACHE_SIZE) {
      this.evictOldEntries(entrySize);
    }

    // エントリ数制限をチェック
    if (this.cache.size >= this.MAX_CACHE_ENTRIES) {
      this.evictOldestEntry();
    }

    const entry: CacheEntry = {
      content: content,
      data: data,
      fileName: fileName,
      timestamp: Date.now(),
      size: entrySize
    };

    this.cache.set(cacheKey, entry);
    this.currentCacheSize += entrySize;

    console.log(`[CacheManager] キャッシュに保存: ${fileName} (サイズ: ${Math.round(entrySize / 1024)}KB)`);
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    const cacheSize = this.cache.size;
    const totalSize = this.currentCacheSize;
    
    this.cache.clear();
    this.currentCacheSize = 0;
    
    console.log(`[CacheManager] キャッシュをクリアしました (${cacheSize}個のエントリ, ${Math.round(totalSize / 1024)}KB)`);
  }

  /**
   * 特定のファイルのキャッシュをクリア
   */
  clearCacheForFile(fileName: string): void {
    const keysToRemove: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.fileName === fileName) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      const entry = this.cache.get(key);
      if (entry) {
        this.currentCacheSize -= entry.size;
        this.cache.delete(key);
      }
    }

    if (keysToRemove.length > 0) {
      console.log(`[CacheManager] ファイルのキャッシュをクリア: ${fileName} (${keysToRemove.length}個のエントリ)`);
    }
  }

  /**
   * メモリ使用量をチェックし、必要に応じてキャッシュをクリア
   */
  checkMemoryUsage(): void {
    const memoryUsage = process.memoryUsage();
    const memoryMB = memoryUsage.heapUsed / 1024 / 1024;
    
    console.log(`[CacheManager] メモリ使用量: ${memoryMB.toFixed(1)}MB`);
    
    if (memoryMB > 150) {
      console.warn(`[CacheManager] メモリ使用量が多いため、キャッシュを強制クリアします: ${memoryMB.toFixed(1)}MB`);
      this.clearCache();
    } else if (memoryMB > 100) {
      console.warn(`[CacheManager] メモリ使用量が多めのため、古いキャッシュをクリアします: ${memoryMB.toFixed(1)}MB`);
      this.evictOldEntries(this.MAX_CACHE_SIZE * 0.3); // 30%分の古いエントリを削除
    } else if (memoryMB > 50) {
      console.log(`[CacheManager] メモリ使用量: ${memoryMB.toFixed(1)}MB（キャッシュ保持中）`);
    } else {
      console.log(`[CacheManager] メモリ使用量: ${memoryMB.toFixed(1)}MB（キャッシュ完全保持中）`);
    }
  }

  /**
   * キャッシュの統計情報を取得
   */
  getCacheStats(): {
    entryCount: number;
    totalSize: number;
    hitRate: number;
    averageEntrySize: number;
  } {
    const entryCount = this.cache.size;
    const totalSize = this.currentCacheSize;
    const averageEntrySize = entryCount > 0 ? totalSize / entryCount : 0;

    return {
      entryCount,
      totalSize,
      hitRate: 0, // パフォーマンスモニターから取得する必要がある
      averageEntrySize
    };
  }

  /**
   * キャッシュキーを生成
   */
  private generateCacheKey(fileName: string, content: string): string {
    // ファイル名とコンテンツのハッシュを組み合わせてキーを生成
    return `${fileName}:${this.hashString(content)}`;
  }

  /**
   * 文字列のハッシュを生成（簡易版）
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32ビット整数に変換
    }
    return hash;
  }

  /**
   * エントリのサイズを計算
   */
  private calculateEntrySize(content: string, data: any): number {
    const contentSize = Buffer.byteLength(content, 'utf8');
    const dataSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
    return contentSize + dataSize;
  }

  /**
   * 古いエントリを削除してスペースを確保
   */
  private evictOldEntries(requiredSpace: number): void {
    // タイムスタンプ順にソート
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    let freedSpace = 0;
    const keysToRemove: string[] = [];

    for (const [key, entry] of entries) {
      if (freedSpace >= requiredSpace) {
        break;
      }
      
      keysToRemove.push(key);
      freedSpace += entry.size;
    }

    // 古いエントリを削除
    for (const key of keysToRemove) {
      const entry = this.cache.get(key);
      if (entry) {
        this.currentCacheSize -= entry.size;
        this.cache.delete(key);
      }
    }

    console.log(`[CacheManager] 古いエントリを削除: ${keysToRemove.length}個 (${Math.round(freedSpace / 1024)}KB 解放)`);
  }

  /**
   * 最も古いエントリを削除
   */
  private evictOldestEntry(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      if (entry) {
        this.currentCacheSize -= entry.size;
        this.cache.delete(oldestKey);
        console.log(`[CacheManager] 最も古いエントリを削除: ${entry.fileName}`);
      }
    }
  }

  /**
   * テスト用: キャッシュ内容を取得（ICacheManagerTestインターフェース実装）
   */
  _getCacheContent(fileName: string): string | null {
    for (const [, entry] of this.cache.entries()) {
      if (entry.fileName === fileName) {
        return entry.content;
      }
    }
    return null;
  }

  /**
   * テスト用: キャッシュをクリア（ICacheManagerTestインターフェース実装）
   */
  _clearCache(): void {
    this.clearCache();
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    this.clearCache();
  }
} 