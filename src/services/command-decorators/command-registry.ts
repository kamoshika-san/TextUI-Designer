import * as vscode from 'vscode';
import { logger } from '../../utils/logger';

/**
 * コマンド登録情報
 */
export interface CommandRegistration {
  command: string;
  title?: string;
  category?: string;
  handler: (...args: any[]) => any;
  options?: {
    when?: string;
    enablement?: string;
  };
}

/**
 * コマンドカテゴリー
 */
export enum CommandCategory {
  PREVIEW = 'preview',
  EXPORT = 'export',
  TEMPLATE = 'template',
  SETTINGS = 'settings',
  SCHEMA = 'schema',
  DEBUG = 'debug',
  PERFORMANCE = 'performance',
  MEMORY = 'memory'
}

/**
 * コマンド登録デコレーター
 */
export function Command(
  command: string,
  category: CommandCategory,
  options?: {
    title?: string;
    when?: string;
    enablement?: string;
  }
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    // メタデータを保存
    if (!target.constructor.commands) {
      target.constructor.commands = new Map<string, CommandRegistration>();
    }
    
    target.constructor.commands.set(command, {
      command,
      title: options?.title,
      category,
      handler: method.bind(target),
      options: {
        when: options?.when,
        enablement: options?.enablement
      }
    });
    
    return descriptor;
  };
}

/**
 * コマンドレジストリ
 * デコレーターベースの自動コマンド登録を管理
 */
export class CommandRegistry {
  private static instance: CommandRegistry;
  private registrations = new Map<string, CommandRegistration>();
  private disposables: vscode.Disposable[] = [];

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): CommandRegistry {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry();
    }
    return CommandRegistry.instance;
  }

  /**
   * クラスからコマンドを登録
   */
  registerCommandsFromClass(instance: any): void {
    const constructor = instance.constructor;
    if (!constructor.commands) {
      return;
    }

    constructor.commands.forEach((registration: CommandRegistration) => {
      this.registerCommand(registration);
    });
  }

  /**
   * 個別のコマンドを登録
   */
  registerCommand(registration: CommandRegistration): void {
    logger.debug(`コマンドを登録: ${registration.command}`);
    
    const disposable = vscode.commands.registerCommand(
      registration.command,
      registration.handler
    );
    
    this.disposables.push(disposable);
    this.registrations.set(registration.command, registration);
    
    logger.debug(`コマンド登録成功: ${registration.command}`);
  }

  /**
   * カテゴリー別にコマンドを登録
   */
  registerCommandsByCategory(category: CommandCategory, commands: CommandRegistration[]): void {
    commands.forEach(command => {
      if (command.category === category) {
        this.registerCommand(command);
      }
    });
  }

  /**
   * 全コマンドを登録
   */
  registerAllCommands(): void {
    logger.info('全コマンドの登録を開始');
    
    this.registrations.forEach(registration => {
      this.registerCommand(registration);
    });
    
    logger.info(`全コマンドの登録完了: ${this.registrations.size}個`);
  }

  /**
   * コマンドを取得
   */
  getCommand(command: string): CommandRegistration | undefined {
    return this.registrations.get(command);
  }

  /**
   * カテゴリー別のコマンドを取得
   */
  getCommandsByCategory(category: CommandCategory): CommandRegistration[] {
    return Array.from(this.registrations.values())
      .filter(registration => registration.category === category);
  }

  /**
   * 全コマンドを取得
   */
  getAllCommands(): CommandRegistration[] {
    return Array.from(this.registrations.values());
  }

  /**
   * コマンド統計を取得
   */
  getCommandStats(): {
    totalCommands: number;
    commandsByCategory: Record<string, number>;
  } {
    const commandsByCategory: Record<string, number> = {};
    
    this.registrations.forEach(registration => {
      const category = registration.category || 'unknown';
      commandsByCategory[category] = (commandsByCategory[category] || 0) + 1;
    });

    return {
      totalCommands: this.registrations.size,
      commandsByCategory
    };
  }

  /**
   * コマンドをクリア
   */
  clearCommands(): void {
    this.registrations.clear();
  }

  /**
   * 登録を破棄
   */
  dispose(): void {
    this.disposables.forEach(disposable => disposable.dispose());
    this.disposables = [];
    this.registrations.clear();
  }
}

/**
 * コマンドベースクラス
 * デコレーターベースのコマンド登録を簡素化
 */
export abstract class CommandBase {
  constructor() {
    // クラスのコマンドを自動登録
    CommandRegistry.getInstance().registerCommandsFromClass(this);
  }

  /**
   * コマンドの前処理
   */
  protected async beforeCommand(command: string): Promise<void> {
    logger.debug(`コマンド実行前処理: ${command}`);
  }

  /**
   * コマンドの後処理
   */
  protected async afterCommand(command: string): Promise<void> {
    logger.debug(`コマンド実行後処理: ${command}`);
  }

  /**
   * コマンド実行のラッパー
   */
  protected async executeCommand<T>(
    command: string,
    operation: () => Promise<T>
  ): Promise<T> {
    await this.beforeCommand(command);
    try {
      const result = await operation();
      await this.afterCommand(command);
      return result;
    } catch (error) {
      logger.error(`コマンド実行エラー: ${command}`, error);
      throw error;
    }
  }
}