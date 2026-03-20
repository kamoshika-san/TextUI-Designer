import { TextUIMemoryTracker } from '../utils/textui-memory-tracker';
import type { ExtensionServices } from './extension-services';
import type { EventManager } from './event-manager';
import type { FileWatcher } from './file-watcher';
import type { MemoryMonitor } from './memory-monitor';
import type { PerformanceTracker } from './performance-tracker';

/** サービス束の生成・解放のみ参照（具象 ServiceInitializer への値 import を避ける） */
export interface ExtensionLifecycleServiceBridge {
  initialize(): Promise<ExtensionServices>;
  cleanup(): Promise<void>;
}

/**
 * activate 時にフェーズ間で共有する状態
 */
export interface ExtensionActivationContext {
  serviceInitializer: ExtensionLifecycleServiceBridge;
  eventManager: EventManager;
  fileWatcher: FileWatcher;
  memoryMonitor: MemoryMonitor;
  performanceTracker: PerformanceTracker;
  /** `services` フェーズ完了後に設定 */
  services: ExtensionServices | null;
}

export interface ExtensionActivationPhase {
  id: string;
  run: (ctx: ExtensionActivationContext) => Promise<void>;
}

/**
 * 拡張 activate の順序。配列順が実行順。
 */
export const ACTIVATION_PHASES: readonly ExtensionActivationPhase[] = [
  {
    id: 'memoryTracker',
    run: async _ctx => {
      TextUIMemoryTracker.getInstance();
    }
  },
  {
    id: 'perfStart',
    run: async ctx => {
      ctx.performanceTracker.startActivation();
    }
  },
  {
    id: 'services',
    run: async ctx => {
      ctx.services = await ctx.serviceInitializer.initialize();
    }
  },
  {
    id: 'events',
    run: async ctx => {
      ctx.eventManager.initialize(ctx.services!);
    }
  },
  {
    id: 'fileWatcher',
    run: async ctx => {
      ctx.fileWatcher.startWatching(ctx.services!);
    }
  },
  {
    id: 'memoryMonitor',
    run: async ctx => {
      ctx.memoryMonitor.startMonitoring();
    }
  },
  {
    id: 'perfComplete',
    run: async ctx => {
      ctx.performanceTracker.completeActivation();
    }
  }
];

export interface ExtensionDeactivationContext {
  performanceTracker: PerformanceTracker;
  memoryMonitor: MemoryMonitor;
  fileWatcher: FileWatcher;
  eventManager: EventManager;
  serviceInitializer: ExtensionLifecycleServiceBridge;
}

export interface ExtensionDeactivationPhase {
  id: string;
  run: (ctx: ExtensionDeactivationContext) => void | Promise<void>;
}

/**
 * 拡張 deactivate の順序。配列順が実行順。
 */
export const DEACTIVATION_PHASES: readonly ExtensionDeactivationPhase[] = [
  {
    id: 'perfDispose',
    run: ctx => {
      ctx.performanceTracker.dispose();
    }
  },
  {
    id: 'memoryMonitorStop',
    run: ctx => {
      ctx.memoryMonitor.stopMonitoring();
    }
  },
  {
    id: 'fileWatcherStop',
    run: ctx => {
      ctx.fileWatcher.stopWatching();
    }
  },
  {
    id: 'eventsDispose',
    run: ctx => {
      ctx.eventManager.dispose();
    }
  },
  {
    id: 'servicesCleanup',
    run: async ctx => {
      await ctx.serviceInitializer.cleanup();
    }
  },
  {
    id: 'memoryTrackerDispose',
    run: _ctx => {
      TextUIMemoryTracker.getInstance().dispose();
    }
  }
];
