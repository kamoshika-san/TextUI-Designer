import type { ElectronModule } from './vscode-api';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isElectronModule = (value: unknown): value is ElectronModule => {
  if (!isRecord(value)) {
    return false;
  }
  const remote = value.remote;
  return isRecord(remote) && typeof remote.getCurrentWindow === 'function';
};

export function attachDevToolsListener(requireFn: ((id: string) => unknown) | undefined): void {
  window.addEventListener('message', (event) => {
    const message = event.data;

    if (isRecord(message) && message.type === 'openDevTools') {
      if (requireFn) {
        try {
          const electronModule = requireFn('electron');
          if (isElectronModule(electronModule)) {
            const currentWindow = electronModule.remote.getCurrentWindow();
            currentWindow.webContents.openDevTools();
          }
        } catch (e) {
          console.log('開発者ツールを開けませんでした:', e);
        }
      }
    }
  });
}
