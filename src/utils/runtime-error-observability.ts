import { Logger } from './logger';

const HANDLER_KEY = Symbol.for('textui.runtimeErrorObservability.unhandledRejection');

type ProcessWithObservability = NodeJS.Process & {
  [HANDLER_KEY]?: (reason: unknown) => void;
};

function formatReason(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message;
  }
  if (typeof reason === 'string') {
    return reason;
  }
  return String(reason);
}

export function installUnhandledRejectionLogger(scope: string): void {
  const processWithObservability = process as ProcessWithObservability;
  if (processWithObservability[HANDLER_KEY]) {
    return;
  }

  const logger = new Logger(scope);
  const handler = (reason: unknown): void => {
    logger.error(`Unhandled promise rejection: ${formatReason(reason)}`, reason);
    if (reason instanceof Error && reason.stack) {
      logger.error('Unhandled promise rejection stack:', reason.stack);
    }
  };

  process.on('unhandledRejection', handler);
  processWithObservability[HANDLER_KEY] = handler;
}
