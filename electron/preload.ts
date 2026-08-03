import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type { HardwareDetails, Settings, Snapshot, UsmApi, WidgetMode } from '../shared/types';

const api: UsmApi = {
  onSnapshot(cb: (snap: Snapshot) => void) {
    const handler = (_e: IpcRendererEvent, snap: Snapshot) => cb(snap);
    ipcRenderer.on('monitor:snapshot', handler);
    return () => ipcRenderer.removeListener('monitor:snapshot', handler);
  },
  getSettings: () => ipcRenderer.invoke('settings:get') as Promise<Settings>,
  setSettings: (patch: Partial<Settings>) => ipcRenderer.invoke('settings:set', patch) as Promise<Settings>,
  getDetails: () => ipcRenderer.invoke('details:get') as Promise<HardwareDetails>,
  windowAction: (action: 'minimize' | 'close' | 'quit') => ipcRenderer.send('window:action', action),
  openLink: (url: string) => ipcRenderer.send('open:link', url),
  openWidget: (id: string) => ipcRenderer.send('widget:open', id),
  closeWidget: (id: string) => ipcRenderer.send('widget:close', id),
  setWidgetMode: (id: string, mode: WidgetMode) => ipcRenderer.send('widget:mode', id, mode),
  onSettingsChanged(cb: (s: Settings) => void) {
    const handler = (_e: IpcRendererEvent, s: Settings) => cb(s);
    ipcRenderer.on('settings:changed', handler);
    return () => ipcRenderer.removeListener('settings:changed', handler);
  },
  screenshot: () => ipcRenderer.invoke('action:screenshot') as Promise<string | null>,
  exportHistory: (format: 'csv' | 'json') => ipcRenderer.invoke('action:export', format) as Promise<string | null>,
  appVersion: () => ipcRenderer.invoke('app:version') as Promise<string>
};

contextBridge.exposeInMainWorld('usm', api);
