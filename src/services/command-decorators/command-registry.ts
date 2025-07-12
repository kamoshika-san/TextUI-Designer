import * as vscode from 'vscode';
import { logger } from '../../utils/logger';

/**
 * コマンド登録のオプション
 */
export interface CommandRegistrationOptions {
  /** コマンドID */
  commandId: string;
  /** コマンドの説明 */
  description?: string;
  /** コマンドのカテゴリー */
  category?: string;
}

/**
 * コマンドメタデータのインターフェース
 */
export interface CommandMetadata {
  commandId: string;
  methodName: string;
  options?: CommandRegistrationOptions;
}

/**
 * コマンドレジストリ
 * クラスからコマンドを自動登録し、適切なthisコンテキストを維持する
 */
export class CommandRegistry {
  private static instance: CommandRegistry;
  private registeredCommands: Map<string, vscode.Disposable> = new Map();
  private commandMetadata: Map<string, CommandMetadata[]> = new Map();

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): CommandRegistry {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry();
    }
    return CommandRegistry.instance;
  }

  /**
   * クラスからコマンドを登録
   * 各メソッドをインスタンスに適切にバインドする
   * 
   * @param instance コマンドハンドラーのインスタンス
   * @param metadata コマンドメタデータの配列
   */
  public registerCommandsFromClass(instance: any, metadata: CommandMetadata[]): void {
    const className = instance.constructor.name;
    logger.debug(`[CommandRegistry] クラス ${className} からコマンドを登録開始`);

    // メタデータを保存
    this.commandMetadata.set(className, metadata);

    // 各コマンドを登録
    for (const cmd of metadata) {
      const method = instance[cmd.methodName];
      
      if (typeof method !== 'function') {
        logger.error(`[CommandRegistry] メソッド ${cmd.methodName} が ${className} に存在しません`);
        continue;
      }

      // 重要な修正: メソッドをインスタンスにバインドする
      // 以前の実装: method.bind(target) - これは間違い
      // 修正後: method.bind(instance) - これが正しい
      const boundMethod = method.bind(instance);

      try {
        const disposable = vscode.commands.registerCommand(cmd.commandId, boundMethod);
        this.registeredCommands.set(cmd.commandId, disposable);
        
        logger.debug(`[CommandRegistry] コマンド登録成功: ${cmd.commandId} -> ${className}.${cmd.methodName}`);
      } catch (error) {
        logger.error(`[CommandRegistry] コマンド登録失敗: ${cmd.commandId}`, error);
      }
    }

    logger.info(`[CommandRegistry] クラス ${className} から ${metadata.length} 個のコマンドを登録完了`);
  }

  /**
   * 特定のコマンドを登録解除
   * 
   * @param commandId コマンドID
   */
  public unregisterCommand(commandId: string): void {
    const disposable = this.registeredCommands.get(commandId);
    if (disposable) {
      disposable.dispose();
      this.registeredCommands.delete(commandId);
      logger.debug(`[CommandRegistry] コマンド登録解除: ${commandId}`);
    }
  }

  /**
   * クラスの全コマンドを登録解除
   * 
   * @param className クラス名
   */
  public unregisterCommandsFromClass(className: string): void {
    const metadata = this.commandMetadata.get(className);
    if (metadata) {
      for (const cmd of metadata) {
        this.unregisterCommand(cmd.commandId);
      }
      this.commandMetadata.delete(className);
      logger.info(`[CommandRegistry] クラス ${className} の全コマンドを登録解除`);
    }
  }

  /**
   * 全コマンドを登録解除
   */
  public unregisterAllCommands(): void {
    for (const [commandId, disposable] of this.registeredCommands) {
      disposable.dispose();
    }
    this.registeredCommands.clear();
    this.commandMetadata.clear();
    logger.info('[CommandRegistry] 全コマンドを登録解除');
  }

  /**
   * 登録済みコマンドの一覧を取得
   */
  public getRegisteredCommands(): string[] {
    return Array.from(this.registeredCommands.keys());
  }

  /**
   * コマンドが登録されているかチェック
   * 
   * @param commandId コマンドID
   */
  public isCommandRegistered(commandId: string): boolean {
    return this.registeredCommands.has(commandId);
  }
}