import type { ExtensionServices } from './extension-services';

/**
 * ランタイム初期化フェーズで共有するコンテキスト（MCP 等、ServiceInitializer のメソッドを注入）
 */
export interface RuntimeInitContext {
  ensureMcpConfigured: () => Promise<void>;
}

export interface RuntimeInitPhase {
  id: string;
  run: (services: ExtensionServices, ctx: RuntimeInitContext) => Promise<void>;
}

/**
 * サービス生成後の初期化順序。配列順が実行順。
 */
export const RUNTIME_INIT_PHASES: readonly RuntimeInitPhase[] = [
  {
    id: 'schema',
    run: async services => {
      await services.schemaManager.initialize();
    }
  },
  {
    id: 'commands',
    run: async services => {
      services.commandManager.registerCommands();
    }
  },
  {
    id: 'mcp',
    run: async (_services, ctx) => {
      await ctx.ensureMcpConfigured();
    }
  },
  {
    id: 'theme',
    run: async services => {
      await services.themeManager.loadTheme();
      services.webViewManager.applyThemeVariables(services.themeManager.generateCSSVariables());
      services.themeManager.watchThemeFile(css => {
        services.webViewManager.applyThemeVariables(css);
      });
    }
  }
];

export interface DisposePhase {
  id: string;
  run: (services: ExtensionServices) => void | Promise<void>;
}

/**
 * cleanup の解放順序。配列順が実行順。
 */
export const DISPOSE_PHASES: readonly DisposePhase[] = [
  {
    id: 'schema',
    run: async services => {
      await services.schemaManager.cleanup();
    }
  },
  {
    id: 'diagnostic',
    run: services => {
      services.diagnosticManager.clearCache();
      services.diagnosticManager.dispose();
    }
  },
  {
    id: 'commands',
    run: services => {
      services.commandManager?.dispose?.();
    }
  },
  {
    id: 'webview',
    run: services => {
      services.webViewManager.dispose();
    }
  },
  {
    id: 'theme',
    run: services => {
      services.themeManager?.dispose?.();
    }
  }
];
