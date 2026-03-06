export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 50
};

function normalizeLogLevel(value: string | undefined): LogLevel {
  if (!value) {
    return process.env.NODE_ENV === 'development' ? 'debug' : 'info';
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'debug' || normalized === 'info' || normalized === 'warn' || normalized === 'error' || normalized === 'silent') {
    return normalized;
  }

  return process.env.NODE_ENV === 'development' ? 'debug' : 'info';
}

export class Logger {
  private readonly scope: string;

  constructor(scope: string) {
    this.scope = scope;
  }

  private shouldLog(level: LogLevel): boolean {
    const current = normalizeLogLevel(process.env.TEXTUI_LOG_LEVEL);
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[current];
  }

  debug(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('debug')) {
      return;
    }
    console.log(`[${this.scope}] ${message}`, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('info')) {
      return;
    }
    console.info(`[${this.scope}] ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('warn')) {
      return;
    }
    console.warn(`[${this.scope}] ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('error')) {
      return;
    }
    console.error(`[${this.scope}] ${message}`, ...args);
  }
}
