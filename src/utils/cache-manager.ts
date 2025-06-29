import type { TextUIDSL, ComponentDef } from '../renderer/types';
import type { ExportFormat } from './style-manager';

export interface CacheEntry {
  content: string;
  timestamp: number;
  hash: string;
  format: ExportFormat;
}

export interface CacheOptions {
  ttl: number; // キャッシュの有効期限（ミリ秒）
  maxSize: number; // 最大キャッシュエントリ数
}

/**
 * レンダリング結果のキャッシュを管理するクラス
 */
export class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private options: CacheOptions;
  private hits: number = 0; // キャッシュヒット数
  private misses: number = 0; // キャッシュミス数

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = {
      ttl: options.ttl || 30000, // デフォルト30秒
      maxSize: options.maxSize || 100 // デフォルト100エントリ
    };
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * キャッシュキーを生成
   */
  private generateKey(dsl: TextUIDSL, format: ExportFormat): string {
    const content = JSON.stringify(dsl);
    const hash = this.hashString(content);
    return `${hash}_${format}`;
  }

  /**
   * 文字列のハッシュを生成（簡易版）
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32ビット整数に変換
    }
    return hash.toString(36);
  }

  /**
   * キャッシュから値を取得
   */
  get(dsl: TextUIDSL, format: ExportFormat): string | null {
    const key = this.generateKey(dsl, format);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // TTLチェック
    if (Date.now() - entry.timestamp > this.options.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.content;
  }

  /**
   * キャッシュに値を保存
   */
  set(dsl: TextUIDSL, format: ExportFormat, content: string): void {
    const key = this.generateKey(dsl, format);
    const hash = this.hashString(JSON.stringify(dsl));

    // キャッシュサイズチェック
    if (this.cache.size >= this.options.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      content,
      timestamp: Date.now(),
      hash,
      format
    });
  }

  /**
   * 最も古いエントリを削除
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * 期限切れのエントリを削除
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.options.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * キャッシュ統計を取得
   */
  getStats(): { size: number; maxSize: number; hitRate: number } {
    const totalAccesses = this.hits + this.misses;
    const hitRate = totalAccesses > 0 ? (this.hits / totalAccesses) * 100 : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hitRate: Math.round(hitRate * 100) / 100 // 小数点以下2桁まで
    };
  }

  /**
   * 特定のフォーマットのキャッシュを削除
   */
  clearFormat(format: ExportFormat): void {
    let removedCount = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.format === format) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    // 削除されたエントリ分、統計を調整（概算）
    // 注意: 厳密にはヒット・ミス比率を保持すべきですが、簡易実装として処理
  }

  /**
   * ヒット・ミスカウンターをリセット
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * 詳細統計を取得
   */
  getDetailedStats(): { size: number; maxSize: number; hits: number; misses: number; hitRate: number; totalAccesses: number } {
    const totalAccesses = this.hits + this.misses;
    const hitRate = totalAccesses > 0 ? (this.hits / totalAccesses) * 100 : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      totalAccesses
    };
  }
} 