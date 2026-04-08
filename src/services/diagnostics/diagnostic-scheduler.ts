import { Logger } from '../../utils/logger';

/** 診断デバウンス用スケジューラ（テストでモック差し替え可能） */
export interface IDiagnosticScheduler {
  schedule(task: () => Promise<void>, delayMs: number): void;
  clear(): void;
}

export class DiagnosticScheduler implements IDiagnosticScheduler {
  private timeout: NodeJS.Timeout | null = null;
  private readonly logger = new Logger('DiagnosticScheduler');

  schedule(task: () => Promise<void>, delayMs: number): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(async () => {
      try {
        await task();
      } catch (error) {
        this.logger.error('Scheduled diagnostic task failed:', error);
        if (error instanceof Error && error.stack) {
          this.logger.error('Scheduled diagnostic task stack:', error.stack);
        }
      }
    }, delayMs);
  }

  clear(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}
