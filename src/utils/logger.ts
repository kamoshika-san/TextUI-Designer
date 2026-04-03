export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOGGER_PREFIX = '[TextUI]';
const LOG_LEVEL_LABELS: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR'
};
const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

export class Logger {
  constructor(private readonly scope: string) {}

  debug(message: string, ...args: unknown[]): void {
    this.write('debug', message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.write('info', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.write('warn', message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.write('error', message, ...args);
  }

  shouldLog(level: LogLevel): boolean {
    const threshold = this.resolveThreshold();
    return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[threshold];
  }

  private resolveThreshold(): LogLevel {
    const configured = process.env.TEXTUI_LOG_LEVEL?.toLowerCase();
    if (configured && this.isLogLevel(configured)) {
      return configured;
    }

    if (process.env.NODE_ENV === 'development') {
      return 'debug';
    }
    return 'info';
  }

  private isLogLevel(value: string): value is LogLevel {
    return value === 'debug' || value === 'info' || value === 'warn' || value === 'error';
  }

  private write(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = `${LOGGER_PREFIX}[${LOG_LEVEL_LABELS[level]}][${this.scope}] ${message}`;
    switch (level) {
      case 'debug':
      case 'info':
        console.log(formattedMessage, ...args);
        return;
      case 'warn':
        console.warn(formattedMessage, ...args);
        return;
      case 'error':
        console.error(formattedMessage, ...args);
    }
  }
}
