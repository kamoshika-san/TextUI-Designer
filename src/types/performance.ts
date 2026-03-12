export interface PerformanceMetrics {
  totalEvents: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  eventsByType: Record<string, number>;
}

export interface PerformanceEvent {
  type: 'render' | 'cache' | 'diff' | 'export' | 'parse' | 'validate';
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
