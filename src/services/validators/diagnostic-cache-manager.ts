import * as vscode from 'vscode';
import { TextUIMemoryTracker } from '../../utils/textui-memory-tracker';
import { ValidationResult } from './base-validator';

/**
 * キャッシュエントリの型定義
 */
interface CacheEntry {
  content: string;
  timestamp: number;
  validationResult: ValidationResult;
}

/**
 * 診断キャッシュ管理を担当するクラス
 */
export class DiagnosticCacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 5000; // 5秒
  private readonly MAX_CACHE_SIZE = 100; // キャッシュサイズ制限
  private readonly MAX_CACHE_AGE = 30000; // 30秒でキャッシュをクリア
  private memoryTracker: TextUIMemoryTracker;

  constructor() {
    this.memoryTracker = TextUIMemoryTracker.getInstance();
  }

  /**
   * キャッシュから検証結果を取得
   */
  get(uri: string, content: string): ValidationResult | null {
    const cacheKey = this.generateCacheKey(uri, content);
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached)) {
      return cached.validationResult;
    }
    
    return null;
  }

  /**
   * キャッシュに検証結果を保存
   */
  set(uri: string, content: string, validationResult: ValidationResult): void {
    // キャッシュサイズ制限をチェック
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.cleanupOldEntries(true); // 強制クリーンアップ
    }
    
    const cacheKey = this.generateCacheKey(uri, content);
    const entry: CacheEntry = {
      content,
      timestamp: Date.now(),
      validationResult
    };
    
    this.cache.set(cacheKey, entry);
    
    // メモリ追跡
    const entrySize = this.estimateCacheEntrySize(entry);
    this.memoryTracker.trackDiagnosticsObject(entry, entrySize, {
      uri,
      contentSize: content.length,
      diagnosticCount: validationResult.diagnostics.length
    });
  }

  /**
   * 特定のURIのキャッシュを削除
   */
  deleteByUri(uri: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache) {
      if (key.startsWith(uri)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 古いキャッシュエントリをクリーンアップ
   */
  cleanupOldEntries(force: boolean = false): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache) {
      const age = now - entry.timestamp;
      
      if (force || age > this.MAX_CACHE_AGE) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * キャッシュの統計情報を取得
   */
  getStats(): { size: number; totalMemory: number; hitRate: number } {
    let totalMemory = 0;
    let hitCount = 0;
    let totalRequests = 0;
    
    for (const [key, entry] of this.cache) {
      totalMemory += this.estimateCacheEntrySize(entry);
      // 簡易的なヒット率計算（実際の実装では別途カウンターが必要）
      hitCount++;
      totalRequests++;
    }
    
    return {
      size: this.cache.size,
      totalMemory,
      hitRate: totalRequests > 0 ? (hitCount / totalRequests) * 100 : 0
    };
  }

  /**
   * キャッシュキーを生成
   */
  private generateCacheKey(uri: string, content: string): string {
    return `${uri}:${this.hashText(content)}`;
  }

  /**
   * キャッシュが有効かチェック
   */
  private isCacheValid(entry: CacheEntry): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < this.CACHE_TTL;
  }

  /**
   * テキストのハッシュ値を生成
   */
  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return hash.toString(16);
  }

  /**
   * キャッシュエントリのサイズを推定
   */
  private estimateCacheEntrySize(entry: CacheEntry): number {
    // 基本的なオブジェクトサイズ
    let size = 100; // 基本サイズ
    
    // コンテンツサイズ
    size += entry.content.length * 2; // 文字列（UTF-16）
    
    // 診断情報サイズ
    size += entry.validationResult.diagnostics.length * 200; // 診断情報あたり約200バイト
    
    // エラー情報サイズ
    if (entry.validationResult.errors) {
      size += entry.validationResult.errors.length * 100; // エラー情報あたり約100バイト
    }
    
    return size;
  }

  /**
   * 定期的なメンテナンス
   */
  performMaintenance(): void {
    this.cleanupOldEntries();
    
    // メモリ使用量が過剰な場合は追加クリーンアップ
    const stats = this.getStats();
    if (stats.totalMemory > 50 * 1024 * 1024) { // 50MB
      this.cleanupOldEntries(true);
    }
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    this.clear();
  }
} 