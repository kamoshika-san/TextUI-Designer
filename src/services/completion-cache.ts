import * as vscode from 'vscode';

/**
 * 補完候補（`CompletionItem[]`）の TTL キャッシュのみを保持する。
 * JSON Schema のロードは行わない（補完のデータ源は descriptor カタログ。スキーマは診断等の別系統）。
 */
export class CompletionCache {
  private completionCache: Map<string, { items: vscode.CompletionItem[]; timestamp: number }> = new Map();

  constructor(private readonly ttl: number) {}

  getCachedCompletionItems(cacheKey: string, now: number): vscode.CompletionItem[] | undefined {
    const cached = this.completionCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < this.ttl) {
      return cached.items;
    }
    return undefined;
  }

  setCachedCompletionItems(cacheKey: string, items: vscode.CompletionItem[], now: number): void {
    this.completionCache.set(cacheKey, {
      items,
      timestamp: now
    });
  }

  clear(): void {
    this.completionCache.clear();
  }

  getCompletionCacheMap(): Map<string, { items: vscode.CompletionItem[]; timestamp: number }> {
    return this.completionCache;
  }
}
