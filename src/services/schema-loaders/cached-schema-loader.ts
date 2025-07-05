import * as fs from 'fs';
import { SchemaDefinition } from '../../types';

/**
 * キャッシュエントリの型定義
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * スキーマローダーの設定
 */
export interface SchemaLoaderConfig {
  /** キャッシュTTL（ミリ秒） */
  cacheTtl?: number;
  /** キャッシュを使用するかどうか */
  useCache?: boolean;
}

/**
 * ジェネリクスを使った統一されたキャッシュスキーマローダー
 */
export class CachedSchemaLoader<T extends SchemaDefinition> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private readonly cacheTtl: number;
  private readonly useCache: boolean;

  constructor(config: SchemaLoaderConfig = {}) {
    this.cacheTtl = config.cacheTtl ?? 30000; // デフォルト30秒
    this.useCache = config.useCache ?? true;
  }

  /**
   * スキーマファイルを読み込み（キャッシュ付き）
   */
  async load(schemaPath: string, transformer?: (data: any) => T): Promise<T> {
    // キャッシュチェック
    if (this.useCache) {
      const cached = this.getCachedData(schemaPath);
      if (cached) {
        console.log(`[CachedSchemaLoader] キャッシュされたスキーマを使用: ${schemaPath}`);
        return cached;
      }
    }

    try {
      // ファイル読み込み
      const content = await this.readFile(schemaPath);
      const parsedData = JSON.parse(content);
      
      // トランスフォーマーがあれば適用
      const transformedData = transformer ? transformer(parsedData) : parsedData as T;
      
      // キャッシュに保存
      if (this.useCache) {
        this.setCachedData(schemaPath, transformedData);
        console.log(`[CachedSchemaLoader] スキーマをキャッシュに保存: ${schemaPath}`);
      }
      
      return transformedData;
    } catch (error) {
      // ファイルパスに基づいてより具体的なエラーメッセージを生成
      let errorType = 'スキーマファイル';
      if (schemaPath.includes('template-schema')) {
        errorType = 'テンプレートスキーマファイル';
      } else if (schemaPath.includes('theme-schema')) {
        errorType = 'テーマスキーマファイル';
      }
      
      throw new Error(`${errorType}の読み込みに失敗しました (${schemaPath}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * キャッシュからデータを取得
   */
  private getCachedData(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    
    const now = Date.now();
    if (now - entry.timestamp > this.cacheTtl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * キャッシュにデータを保存
   */
  private setCachedData(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * ファイルを非同期で読み込み
   */
  private async readFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  /**
   * キャッシュをクリア
   */
  clearCache(schemaPath?: string): void {
    if (schemaPath) {
      this.cache.delete(schemaPath);
      console.log(`[CachedSchemaLoader] 特定のキャッシュをクリア: ${schemaPath}`);
    } else {
      this.cache.clear();
      console.log('[CachedSchemaLoader] 全キャッシュをクリア');
    }
  }

  /**
   * キャッシュサイズを取得
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * キャッシュの統計情報を取得
   */
  getCacheStats(): { size: number; keys: string[]; ttl: number } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      ttl: this.cacheTtl
    };
  }

  /**
   * 古いキャッシュエントリをクリーンアップ
   */
  cleanupExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.cacheTtl) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`[CachedSchemaLoader] 期限切れキャッシュを削除: ${expiredKeys.length}個`);
    }
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    this.clearCache();
  }
} 