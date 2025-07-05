import { ErrorHandler } from '../../utils/error-handler';

/**
 * コマンド実行のオプション
 */
export interface CommandOptions {
  /** エラーメッセージ */
  errorMessage?: string;
  /** 成功メッセージ */
  successMessage?: string;
  /** エラー時に例外を再スローするか */
  rethrow?: boolean;
  /** エラー時のフォールバック処理 */
  fallback?: () => Promise<void> | void;
}

/**
 * 安全なコマンド実行のためのデコレーター
 * 
 * @param options コマンド実行オプション
 * @returns デコレーター関数
 * 
 * @example
 * ```typescript
 * class MyCommands {
 *   @SafeCommand({ errorMessage: 'ファイル保存に失敗しました' })
 *   async saveFile(): Promise<void> {
 *     // 処理のみ記述、エラーハンドリングは自動
 *   }
 * }
 * ```
 */
export function SafeCommand(options: CommandOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const {
        errorMessage = `${propertyName}の実行に失敗しました`,
        successMessage,
        rethrow = false,
        fallback
      } = options;

      const result = await ErrorHandler.withErrorHandling(async () => {
        return await method.apply(this, args);
      }, errorMessage);

      if (!result) {
        // エラーが発生した場合
        if (fallback) {
          try {
            await fallback();
          } catch (fallbackError) {
            console.error(`[SafeCommand] フォールバック処理でエラー:`, fallbackError);
          }
        }
        
        if (rethrow) {
          throw new Error(errorMessage);
        }
        
        return;
      }

      // 成功時のメッセージ表示
      if (successMessage) {
        ErrorHandler.showInfo(successMessage);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * 非同期コマンド実行のための簡易ヘルパー
 */
export class CommandExecutor {
  /**
   * 安全にコマンドを実行
   */
  static async executeSafely<T>(
    operation: () => Promise<T>,
    options: CommandOptions = {}
  ): Promise<T | null> {
    const {
      errorMessage = '操作の実行に失敗しました',
      successMessage,
      fallback
    } = options;

    const result = await ErrorHandler.withErrorHandling(operation, errorMessage);

    if (!result && fallback) {
      try {
        await fallback();
      } catch (fallbackError) {
        console.error(`[CommandExecutor] フォールバック処理でエラー:`, fallbackError);
      }
    }

    if (result && successMessage) {
      ErrorHandler.showInfo(successMessage);
    }

    return result ?? null;
  }

  /**
   * 複数のコマンドを順次実行
   */
  static async executeSequential(
    operations: Array<() => Promise<void>>,
    options: CommandOptions = {}
  ): Promise<boolean> {
    const { errorMessage = '一連の操作の実行に失敗しました' } = options;

    try {
      for (const operation of operations) {
        await operation();
      }
      return true;
    } catch (error) {
      console.error('[CommandExecutor] 順次実行エラー:', error);
      ErrorHandler.showError(errorMessage);
      return false;
    }
  }

  /**
   * 複数のコマンドを並列実行
   */
  static async executeParallel(
    operations: Array<() => Promise<void>>,
    options: CommandOptions = {}
  ): Promise<boolean> {
    const { errorMessage = '並列操作の実行に失敗しました' } = options;

    try {
      await Promise.all(operations.map(op => op()));
      return true;
    } catch (error) {
      console.error('[CommandExecutor] 並列実行エラー:', error);
      ErrorHandler.showError(errorMessage);
      return false;
    }
  }
} 