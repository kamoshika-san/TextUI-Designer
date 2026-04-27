export interface VSCodeApiState {
  theme?: 'light' | 'dark' | string;
  [key: string]: unknown;
}

export interface VSCodeApi {
  postMessage: (message: unknown) => void;
  getState?: () => VSCodeApiState | undefined;
  setState?: (state: unknown) => void;
}

export interface ElectronRemoteWindow {
  webContents: {
    openDevTools: () => void;
  };
}

export interface ElectronRemote {
  getCurrentWindow: () => ElectronRemoteWindow;
}

export interface ElectronModule {
  remote: ElectronRemote;
}

declare global {
  interface Window {
    vscode?: VSCodeApi;
    require?: (moduleName: string) => unknown;
  }
}

let _platformBridge: VSCodeApi | undefined;

/** Obsidian など非 VSCode 環境からブリッジを注入する（設定済みならフォールバックより優先）*/
export function setPlatformBridge(bridge: VSCodeApi): void {
  _platformBridge = bridge;
}

export function getVSCodeApi(): VSCodeApi | undefined {
  return _platformBridge ?? window.vscode;
}
