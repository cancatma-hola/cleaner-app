// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'
import type { ScanConfig } from '../renderer/src/types'

const api = {
  // Scanner
  startScan: (config: ScanConfig) => ipcRenderer.invoke('scan:start', config),
  stopScan: () => ipcRenderer.invoke('scan:stop'),
  onProgress: (cb: (p: unknown) => void) => {
    ipcRenderer.on('scan:progress', (_e, p) => cb(p))
  },
  offProgress: () => ipcRenderer.removeAllListeners('scan:progress'),

  // Trash
  trashFiles: (paths: string[]) => ipcRenderer.invoke('trash:files', paths),
  revealInFinder: (path: string) => ipcRenderer.invoke('trash:reveal', path),

  // Disk
  getDiskInfo: () => ipcRenderer.invoke('disk:info'),

  // Settings
  getSettings: () => ipcRenderer.invoke('store:getSettings'),
  saveSettings: (s: unknown) => ipcRenderer.invoke('store:saveSettings', s),
}

contextBridge.exposeInMainWorld('cleaner', api)

export type CleanerAPI = typeof api
