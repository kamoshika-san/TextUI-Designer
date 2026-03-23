import type * as vscode from 'vscode';
import { Logger } from '../../utils/logger';

export type DiagnosticCacheEntry = {
  content: string;
  diagnostics: vscode.Diagnostic[];
  timestamp: number;
};

const logger = new Logger('DiagnosticManager');

export class DiagnosticCacheStore {
  constructor(
    private readonly cache: Map<string, DiagnosticCacheEntry>,
    private readonly maxSize: number,
    private readonly maxAge: number
  ) {}

  getFresh(uri: string, content: string, ttl: number, now: number = Date.now()): DiagnosticCacheEntry | null {
    const cached = this.cache.get(uri);
    if (!cached) {
      return null;
    }

    if (cached.content !== content) {
      return null;
    }

    if ((now - cached.timestamp) >= ttl) {
      return null;
    }

    return cached;
  }

  set(uri: string, entry: DiagnosticCacheEntry): void {
    this.cache.set(uri, entry);
  }

  delete(uri: string): void {
    this.cache.delete(uri);
  }

  clear(): void {
    this.cache.clear();
  }

  ensureCapacity(): void {
    if (this.cache.size < this.maxSize) {
      return;
    }

    logger.warn('キャッシュサイズ制限に達したため、古いキャッシュをクリアします');
    this.cleanupOldCache(true);
  }

  cleanupOldCache(force: boolean = false): void {
    const now = Date.now();
    const staleKeys: string[] = [];

    for (const [key, { timestamp }] of this.cache) {
      if (force || (now - timestamp > this.maxAge)) {
        staleKeys.push(key);
      }
    }

    for (const key of staleKeys) {
      this.cache.delete(key);
    }
  }

  clearLegacyKeys(uri: string): void {
    const legacyKeyPrefix = `${uri}:`;
    for (const cacheKey of this.cache.keys()) {
      if (cacheKey.startsWith(legacyKeyPrefix)) {
        this.cache.delete(cacheKey);
      }
    }
  }
}
