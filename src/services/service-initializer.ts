import * as vscode from 'vscode';
import { McpBootstrapService } from './mcp-bootstrap-service';
import { ServiceFactory } from './service-factory';
import { DISPOSE_PHASES, RUNTIME_INIT_PHASES } from './service-runtime-phases';
import { Logger } from '../utils/logger';
import type { ExtensionServices } from './extension-services';
import type {
  ISchemaManager,
  IThemeManager,
  IWebViewManager,
  IExportManager,
  ITemplateService,
  ISettingsService
} from '../types';
export type { ExtensionServices } from './extension-services';

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
 * サービスの初期化・管理（サービス束の生成〜ランタイム初期化〜束の cleanup）。
 * 拡張全体の activate / deactivate の前後段階は `ExtensionLifecycleManager` と `extension-lifecycle-phases.ts` が担当する。
 * ファクトリーオーバーライドにより、テスト時のモック注入やカスタム構成が可能。
 */
export class ServiceInitializer {
  private context: vscode.ExtensionContext;
  private services: ExtensionServices | null = null;
  private factoryOverrides: ServiceFactoryOverrides;
  private readonly logger = new Logger('ServiceInitializer');

  constructor(context: vscode.ExtensionContext, factoryOverrides?: ServiceFactoryOverrides) {
    this.context = context;
    this.factoryOverrides = factoryOverrides || {};
  }

  /**
   * 全サービスの初期化
   */
  async initialize(): Promise<ExtensionServices> {
    this.logger.info('サービス初期化開始');

    try {
      this.services = this.createServices();

      await this.initializeRuntime(this.services);

      this.logger.info('全サービス初期化完了');
      return this.services;

    } catch (error) {
      this.logger.error('サービス初期化中にエラーが発生しました:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * 全サービスのクリーンアップ
   */
  async cleanup(): Promise<void> {
    this.logger.info('サービスクリーンアップ開始');

    try {
      if (this.services) {
        const snapshot = this.services;
        for (const phase of DISPOSE_PHASES) {
          await phase.run(snapshot);
        }
        this.services = null;
      }

      this.logger.info('サービスクリーンアップ完了');

    } catch (error) {
      this.logger.error('サービスクリーンアップ中にエラーが発生しました:', error);
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
    const ctx = { ensureMcpConfigured: () => this.ensureMcpConfigured() };
    for (const phase of RUNTIME_INIT_PHASES) {
      await phase.run(services, ctx);
    }
  }

  private async ensureMcpConfigured(): Promise<void> {
    try {
      const mcpBootstrap = new McpBootstrapService(this.context);
      const result = await mcpBootstrap.ensureConfigured();
      if (result.updated) {
        this.logger.info(`MCP設定を更新しました: ${result.updatedFiles.join(', ')}`);
      } else if (result.reason) {
        this.logger.info(`MCP設定をスキップ: ${result.reason}`);
      }
    } catch (error) {
      this.logger.warn('MCP設定中にエラーが発生しました:', error);
    }
  }
} 
