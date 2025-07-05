import * as vscode from 'vscode';

interface CachedCompletion {
  items: vscode.CompletionItem[];
  timestamp: number;
}

/**
 * 補完キャッシュマネージャー
 * 補完候補のキャッシュを効率的に管理
 */
export class CompletionCache {
  private cache = new Map<string, CachedCompletion>();
  private readonly ttl: number;
  private readonly maxSize: number;

  constructor(ttl: number = 10000, maxSize: number = 100) {
    this.ttl = ttl;
    this.maxSize = maxSize;
  }

  /**
   * キャッシュから補完候補を取得
   */
  get(key: string): vscode.CompletionItem[] | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.items;
  }

  /**
   * 補完候補をキャッシュに保存
   */
  set(key: string, items: vscode.CompletionItem[]): void {
    // キャッシュサイズ制限チェック
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      items: [...items], // 配列をコピー
      timestamp: Date.now()
    });
  }

  /**
   * キャッシュキーを生成
   */
  generateKey(
    document: { getText: () => string; offsetAt: (pos: any) => number; uri: { toString: () => string } },
    position: { line: number; character: number },
    context: { triggerCharacter?: string },
    isTemplate: boolean
  ): string {
    const text = document.getText();
    const linePrefix = text.substring(
      document.offsetAt({ line: position.line, character: 0 }),
      document.offsetAt(position)
    );
    const triggerChar = context.triggerCharacter || '';
    
    return `${document.uri.toString()}:${position.line}:${position.character}:${isTemplate}:${triggerChar}:${linePrefix}`;
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 古いエントリを削除
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 期限切れのエントリを削除
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * キャッシュ統計を取得
   */
  getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0 // TODO: ヒット率の計算を実装
    };
  }
} 