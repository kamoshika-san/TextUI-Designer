import * as vscode from 'vscode';
import { RuntimeInspectionService } from './runtime-inspection-service';
import {
  createRuntimeInspectionCommandBindings,
  type RuntimeInspectionCommandBindings
} from './runtime-inspection-command-bindings';
import {
  createAuthoringFeatureRegistry,
  createCommandFeatureBindings,
  createPreviewExportFeatureRegistry
} from './command-feature-registries';
import { Logger } from '../utils/logger';
import type {
  ICommandManager,
  IWebViewManager,
  IExportService,
  ITemplateService,
  ISettingsService,
  ISchemaManager,
  IThemeManager
} from '../types';
import { createCommandDefinitions, type CommandHandler } from './command-catalog';

export interface CommandManagerDependencies {
  webViewManager: IWebViewManager;
  exportService: IExportService;
  templateService: ITemplateService;
  settingsService: ISettingsService;
  schemaManager: ISchemaManager;
  themeManager?: IThemeManager;
  /**
   * runtime inspection コマンド群のコールバック束。未指定時は `RuntimeInspectionService` から生成する。
   */
  runtimeInspection?: RuntimeInspectionCommandBindings;
}


/**
 * コマンド管理サービス
 * VS Code拡張のコマンド登録と実行を担当
 */
export class CommandManager implements ICommandManager {
  private context: vscode.ExtensionContext;
  private webViewManager: IWebViewManager;
  private exportService: IExportService;
  private templateService: ITemplateService;
  private settingsService: ISettingsService;
  private schemaManager: ISchemaManager;
  private themeManager?: IThemeManager;
  private runtimeInspection: RuntimeInspectionCommandBindings;
  private readonly logger = new Logger('CommandManager');
  private commandDisposables: vscode.Disposable[] = [];

  constructor(
    context: vscode.ExtensionContext,
    dependencies: CommandManagerDependencies
  ) {
    this.context = context;
    this.webViewManager = dependencies.webViewManager;
    this.exportService = dependencies.exportService;
    this.templateService = dependencies.templateService;
    this.settingsService = dependencies.settingsService;
    this.schemaManager = dependencies.schemaManager;
    this.themeManager = dependencies.themeManager;
    this.runtimeInspection =
      dependencies.runtimeInspection ??
      createRuntimeInspectionCommandBindings(new RuntimeInspectionService());
  }

  /**
   * コマンドを登録（定義は `command-catalog`＋`template-settings-command-entries`＋`runtime-inspection-command-entries` に集約）。
   */
  registerCommands(): void {
    this.logger.info('コマンド登録を開始');

    const previewExport = createPreviewExportFeatureRegistry({
      webViewManager: this.webViewManager,
      exportService: this.exportService,
      themeManager: this.themeManager,
      extensionPath: this.context.extensionPath,
      logger: this.logger
    });
    const authoring = createAuthoringFeatureRegistry({
      templateService: this.templateService,
      settingsService: this.settingsService,
      schemaManager: this.schemaManager,
      logger: this.logger
    });
    const commandDefinitions = createCommandDefinitions(
      createCommandFeatureBindings(previewExport, authoring, this.runtimeInspection)
    );

    for (const { command, callback } of commandDefinitions) {
      this.registerCommand(command, callback);
    }

    this.logger.info('コマンド登録完了');
  }

  /**
   * コマンドを登録
   */
  private registerCommand(command: string, callback: CommandHandler): void {
    this.logger.debug(`コマンドを登録: ${command}`);
    const disposable = vscode.commands.registerCommand(command, callback);
    this.commandDisposables.push(disposable);
    this.context.subscriptions.push(disposable);
    this.logger.debug(`コマンド登録成功: ${command}`);
  }

  /**
   * CommandManagerが直接保持するリソースを解放
   */
  dispose(): void {
    this.commandDisposables.forEach(disposable => {
      try {
        disposable.dispose();
      } catch (error) {
        this.logger.warn('disposable解放時にエラーが発生しました:', error);
      }
    });
    this.commandDisposables = [];
  }

}
