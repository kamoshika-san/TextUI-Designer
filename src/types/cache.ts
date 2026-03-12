export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  size: number;
  fileName: string;
}

export interface CacheOptions {
  ttl?: number;
  maxSize?: number;
  maxEntries?: number;
}

export function isCacheEntry<T>(obj: unknown): obj is CacheEntry<T> {
  return typeof obj === 'object' && obj !== null && 'data' in obj && 'timestamp' in obj;
}
