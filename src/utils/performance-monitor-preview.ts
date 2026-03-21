import { PerformanceMonitor } from './performance-monitor';

/**
 * プレビュー（WebView / YAML 解析）経路の計測入口。
 * Export 側の `PerformanceMonitor` 直参照と区別するための論理名前空間（T-078）。
 */
export class PreviewPerformanceMonitor {
  private readonly inner: PerformanceMonitor;

  constructor() {
    this.inner = PerformanceMonitor.getInstance();
  }

  async measureRenderTime<T>(renderFunction: () => Promise<T>): Promise<T> {
    return this.inner.measureRenderTime(renderFunction);
  }

  recordCacheHit(hit: boolean): void {
    this.inner.recordCacheHit(hit);
  }
}
