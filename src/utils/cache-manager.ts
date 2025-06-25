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
  private totalRequests = 0;
  private cacheHits = 0;

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = {
      ttl: options.ttl || 30000, // デフォルト30秒
      maxSize: options.maxSize || 100 // デフォルト100エントリ
    };
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
    this.totalRequests++;
    const key = this.generateKey(dsl, format);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // TTLチェック
    if (Date.now() - entry.timestamp > this.options.ttl) {
      this.cache.delete(key);
      return null;
    }

    this.cacheHits++;
    return entry.content;
  }

  /**
   * キャッシュに値を保存
   */
  set(dsl: TextUIDSL, format: ExportFormat, content: string): void {
    this.totalRequests++;
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
    const hitRate = this.totalRequests === 0 ? 0 : this.cacheHits / this.totalRequests;
    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hitRate
    };
  }

  /**
   * 特定のフォーマットのキャッシュを削除
   */
  clearFormat(format: ExportFormat): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.format === format) {
        this.cache.delete(key);
      }
    }
  }
} 