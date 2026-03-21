import type { WebViewPreviewCacheManager } from './cache-manager';

/**
 * Preview 更新パイプラインの **PreviewCache** ポート（lookup のみ本スライス）。
 * force 更新時はキャッシュを読まない。
 */
export function lookupPreviewCacheData(
  cacheManager: WebViewPreviewCacheManager,
  fileName: string,
  content: string,
  forceUpdate: boolean
): unknown | null {
  if (forceUpdate) {
    return null;
  }
  return cacheManager.getCachedData(fileName, content);
}
