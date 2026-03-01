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

export function getVSCodeApi(): VSCodeApi | undefined {
  return window.vscode;
}
