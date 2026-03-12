export class DiagnosticScheduler {
  private timeout: NodeJS.Timeout | null = null;

  schedule(task: () => Promise<void>, delayMs: number): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(async () => {
      try {
        await task();
      } catch (error) {
        console.error('[DiagnosticManager] 診断処理でエラーが発生しました:', error);
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
