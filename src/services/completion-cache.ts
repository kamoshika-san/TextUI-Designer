import * as vscode from 'vscode';
import { ISchemaManager, SchemaDefinition } from '../types';

export class CompletionCache {
  private schemaCache: SchemaDefinition | null = null;
  private lastSchemaLoad: number = 0;
  private completionCache: Map<string, { items: vscode.CompletionItem[]; timestamp: number }> = new Map();

  constructor(private readonly schemaManager: ISchemaManager, private readonly ttl: number) {}

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

  async loadSchemaWithCache(now: number): Promise<SchemaDefinition> {
    if (!this.schemaCache || (now - this.lastSchemaLoad) > this.ttl) {
      this.schemaCache = await this.schemaManager.loadSchema();
      this.lastSchemaLoad = now;
    }
    return this.schemaCache;
  }

  clear(): void {
    this.completionCache.clear();
    this.schemaCache = null;
    this.lastSchemaLoad = 0;
  }

  getSchemaCache(): SchemaDefinition | null {
    return this.schemaCache;
  }


  getLastSchemaLoad(): number {
    return this.lastSchemaLoad;
  }


  getCompletionCacheMap(): Map<string, { items: vscode.CompletionItem[]; timestamp: number }> {
    return this.completionCache;
  }
}
