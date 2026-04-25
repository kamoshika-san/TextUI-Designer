export interface PreviewUpdatePort {
  updatePreview(forceUpdate?: boolean): Promise<void>;
  setLastTuiFile(filePath: string, updatePreview?: boolean): void;
  getLastTuiFile(): string | undefined;
  dispose(): void;
  openDevTools(): void;
}

export interface PreviewMessagePort {
  setupMessageHandler(): void;
  sendUpdatingSignal(): void;
  applyThemeVariables(css: string): void;
  notifyThemeChange(theme: 'light' | 'dark'): void;
  sendPreviewSettings(): void;
  switchTheme(themePath: string): Promise<void>;
  sendAvailableThemes(): Promise<void>;
}
