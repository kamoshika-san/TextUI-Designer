/**
 * メモリカテゴリの種類
 */
export type MemoryCategoryType = 'webview' | 'yaml-cache' | 'diagnostics' | 'render-cache';

/**
 * メモリ追跡オブジェクトの情報
 */
export interface MemoryTrackedObject {
  id: string;
  type: MemoryCategoryType;
  size: number; // バイト単位
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * メモリカテゴリの統計情報
 */
export interface MemoryCategoryStats {
  totalSize: number;
  objectCount: number;
  averageSize: number;
  lastUpdated: number;
}

/**
 * 効率的なメモリカテゴリ管理クラス
 */
export class MemoryCategory {
  private objects = new Map<string, MemoryTrackedObject>();
  private stats: MemoryCategoryStats = {
    totalSize: 0,
    objectCount: 0,
    averageSize: 0,
    lastUpdated: 0
  };

  constructor(private readonly type: MemoryCategoryType) {}

  /**
   * オブジェクトを追跡に追加（O(1)）
   */
  trackObject(id: string, size: number, metadata?: Record<string, any>): void {
    const trackedObj: MemoryTrackedObject = {
      id,
      type: this.type,
      size,
      timestamp: Date.now(),
      metadata
    };

    this.objects.set(id, trackedObj);
    this.updateStats();
  }

  /**
   * オブジェクトを追跡から削除（O(1)）
   */
  untrackObject(id: string): boolean {
    const obj = this.objects.get(id);
    if (obj) {
      this.objects.delete(id);
      this.updateStats();
      return true;
    }
    return false;
  }

  /**
   * 統計情報を取得（O(1)）
   */
  getStats(): MemoryCategoryStats {
    return { ...this.stats };
  }

  /**
   * 全オブジェクトを取得（O(n) - 必要な場合のみ）
   */
  getAllObjects(): MemoryTrackedObject[] {
    return Array.from(this.objects.values());
  }

  /**
   * 特定のオブジェクトを取得（O(1)）
   */
  getObject(id: string): MemoryTrackedObject | undefined {
    return this.objects.get(id);
  }

  /**
   * カテゴリをクリア
   */
  clear(): void {
    this.objects.clear();
    this.updateStats();
  }

  /**
   * 統計情報を更新（O(1)）
   */
  private updateStats(): void {
    const objects = Array.from(this.objects.values());
    const totalSize = objects.reduce((sum, obj) => sum + obj.size, 0);
    const objectCount = objects.length;
    const averageSize = objectCount > 0 ? totalSize / objectCount : 0;

    this.stats = {
      totalSize,
      objectCount,
      averageSize,
      lastUpdated: Date.now()
    };
  }

  /**
   * 古いオブジェクトを自動クリーンアップ
   */
  cleanupOldObjects(maxAgeMs: number): number {
    const now = Date.now();
    const oldIds: string[] = [];

    for (const [id, obj] of this.objects.entries()) {
      if (now - obj.timestamp > maxAgeMs) {
        oldIds.push(id);
      }
    }

    oldIds.forEach(id => this.objects.delete(id));
    
    if (oldIds.length > 0) {
      this.updateStats();
    }

    return oldIds.length;
  }

  /**
   * メモリ使用量をMB単位で取得
   */
  getMemoryUsageMB(): number {
    return this.stats.totalSize / (1024 * 1024);
  }

  /**
   * オブジェクト数が上限に達しているかチェック
   */
  isAtCapacity(maxObjects: number): boolean {
    return this.stats.objectCount >= maxObjects;
  }

  /**
   * メモリ使用量が上限に達しているかチェック
   */
  isAtMemoryLimit(maxMemoryMB: number): boolean {
    return this.getMemoryUsageMB() >= maxMemoryMB;
  }
} 