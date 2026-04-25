import { Logger } from '../utils/logger';
import { installUnhandledRejectionLogger } from '../utils/runtime-error-observability';

export interface ObsidianHostLifecycle {
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  registerCommand?(commandId: string, handler: () => Promise<void> | void): void;
}

export interface ObsidianBootstrapOptions {
  commandId?: string;
  validateParse?: () => Promise<void>;
  installRejectionLogger?: boolean;
}

let lifecycle: ObsidianHostLifecycle | undefined;
const logger = new Logger('ObsidianBootstrap');
let rejectionLoggerInstalled = false;

export async function bootstrapObsidian(
  hostLifecycle: ObsidianHostLifecycle,
  options: ObsidianBootstrapOptions = {}
): Promise<void> {
  const installRejectionLogger = options.installRejectionLogger ?? true;
  if (installRejectionLogger && !rejectionLoggerInstalled) {
    installUnhandledRejectionLogger('ObsidianBootstrap');
    rejectionLoggerInstalled = true;
  }

  logger.info('アクティベーション開始');

  try {
    lifecycle = hostLifecycle;
    await lifecycle.activate();

    if (options.validateParse) {
      await options.validateParse();
    }

    if (options.commandId && options.validateParse && lifecycle.registerCommand) {
      lifecycle.registerCommand(options.commandId, async () => {
        await options.validateParse?.();
      });
    }

    logger.info('アクティベーション完了');
  } catch (error) {
    logger.error('アクティベーション中にエラーが発生しました:', error);
    if (error instanceof Error && error.stack) {
      logger.error('スタックトレース:', error.stack);
    }
    throw error;
  }
}

export function teardownObsidian(): void {
  logger.info('非アクティブ化中');

  if (lifecycle) {
    lifecycle.deactivate().catch(error => {
      logger.error('ライフサイクルのクリーンアップに失敗しました:', error);
    });
    lifecycle = undefined;
  }

  logger.info('非アクティブ化完了');
}
