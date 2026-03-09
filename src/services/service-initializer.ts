import * as vscode from 'vscode';
import { McpBootstrapService } from './mcp-bootstrap-service';
import { ServiceFactory } from './service-factory';
import type {
  ISchemaManager,
  IThemeManager,
  IWebViewManager,
  IExportManager,
  IExportService,
  ITemplateService,
  ISettingsService,
  IDiagnosticManager,
  ICompletionProvider,
  ICommandManager
} from '../types';

export interface ExtensionServices {
  schemaManager: ISchemaManager;
  themeManager: IThemeManager;
  webViewManager: IWebViewManager;
  exportManager: IExportManager;
  exportService: IExportService;
  templateService: ITemplateService;
  settingsService: ISettingsService;
  diagnosticManager: IDiagnosticManager;
  completionProvider: ICompletionProvider;
  commandManager: ICommandManager;
}

/**
 * サービスファクトリーのオーバーライド
 * テスト時やカスタム構成でサービスの生成を差し替えるための型
 */
export interface ServiceFactoryOverrides {
  createSchemaManager?: (context: vscode.ExtensionContext) => ISchemaManager;
  createThemeManager?: (context: vscode.ExtensionContext) => IThemeManager;
  createWebViewManager?: (
    context: vscode.ExtensionContext,
    themeManager: IThemeManager,
    schemaManager: ISchemaManager
  ) => IWebViewManager;
  createExportManager?: () => IExportManager;
  createTemplateService?: () => ITemplateService;
  createSettingsService?: () => ISettingsService;
}

/**
 * サービスの初期化・管理
 * 各サービスの作成、初期化、クリーンアップを担当
 * ファクトリーオーバーライドにより、テスト時のモック注入やカスタム構成が可能
 */
export class ServiceInitializer {
  private context: vscode.ExtensionContext;
  private services: ExtensionServices | null = null;
  private factoryOverrides: ServiceFactoryOverrides;

  constructor(context: vscode.ExtensionContext, factoryOverrides?: ServiceFactoryOverrides) {
    this.context = context;
    this.factoryOverrides = factoryOverrides || {};
  }

  /**
   * 全サービスの初期化
   */
  async initialize(): Promise<ExtensionServices> {
    console.log('[ServiceInitializer] サービス初期化開始');

    try {
      this.services = this.createServices();

      await this.initializeRuntime(this.services);

      console.log('[ServiceInitializer] 全サービス初期化完了');
      return this.services;

    } catch (error) {
      console.error('[ServiceInitializer] サービス初期化中にエラーが発生しました:', error);
      throw error;
    }
  }

  /**
   * 全サービスのクリーンアップ
   */
  async cleanup(): Promise<void> {
    console.log('[ServiceInitializer] サービスクリーンアップ開始');

    try {
      if (this.services) {
        await this.services.schemaManager.cleanup();

        this.services.diagnosticManager.clearCache();
        this.services.diagnosticManager.dispose();

        this.services.commandManager?.dispose?.();

        this.services.webViewManager.dispose();

        this.services.themeManager?.dispose?.();

        this.services = null;
      }

      console.log('[ServiceInitializer] サービスクリーンアップ完了');

    } catch (error) {
      console.error('[ServiceInitializer] サービスクリーンアップ中にエラーが発生しました:', error);
    }
  }

  /**
   * サービスを取得
   */
  getServices(): ExtensionServices | null {
    return this.services;
  }


  private createServices(): ExtensionServices {
    const serviceFactory = new ServiceFactory(this.context, this.factoryOverrides);
    return serviceFactory.create();
  }

  private async initializeRuntime(services: ExtensionServices): Promise<void> {
    await services.schemaManager.initialize();
    services.commandManager.registerCommands();
    await this.ensureMcpConfigured();

    await services.themeManager.loadTheme();
    services.webViewManager.applyThemeVariables(services.themeManager.generateCSSVariables());
    services.themeManager.watchThemeFile(css => {
      services.webViewManager.applyThemeVariables(css);
    });
  }

  private async ensureMcpConfigured(): Promise<void> {
    try {
      const mcpBootstrap = new McpBootstrapService(this.context);
      const result = await mcpBootstrap.ensureConfigured();
      if (result.updated) {
        console.log('[ServiceInitializer] MCP設定を更新しました:', result.updatedFiles.join(', '));
      } else if (result.reason) {
        console.log(`[ServiceInitializer] MCP設定をスキップ: ${result.reason}`);
      }
    } catch (error) {
      console.warn('[ServiceInitializer] MCP設定中にエラーが発生しました:', error);
    }
  }
} 