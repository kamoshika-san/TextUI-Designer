export interface MemoryMetrics {
  totalMemory: number;
  webviewMemory: number;
  yamlCacheMemory: number;
  diagnosticsMemory: number;
  renderCacheMemory: number;
  lastMeasurement: number;
}

export interface MemoryTrackedObject {
  id: string;
  size: number;
  category: 'webview' | 'yaml-cache' | 'diagnostics' | 'render-cache';
  metadata?: Record<string, unknown>;
  timestamp: number;
}
