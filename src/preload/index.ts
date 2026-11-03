// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'
import type { ScanConfig, SystemInfo, CleanTarget, CleanStats, CleanOutcome } from '../renderer/src/types'

const api = {
  // Platform ('darwin' | 'win32' | 'linux') — synchronous, for labels
  platform: process.platform as string,
  getSystemInfo: (): Promise<SystemInfo> => ipcRenderer.invoke('system:info'),
  pickFolders: (): Promise<string[]> => ipcRenderer.invoke('dialog:pickFolders'),

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

  // System cleanup (target IDs only — paths are resolved in the main process)
  listCleanTargets: (): Promise<CleanTarget[]> => ipcRenderer.invoke('sysclean:list'),
  analyzeCleanTarget: (id: string): Promise<CleanStats> => ipcRenderer.invoke('sysclean:analyze', id),
  cleanTarget: (id: string): Promise<CleanOutcome> => ipcRenderer.invoke('sysclean:clean', id),

  // Disk
  getDiskInfo: () => ipcRenderer.invoke('disk:info'),

  // Settings
  getSettings: () => ipcRenderer.invoke('store:getSettings'),
  saveSettings: (s: unknown) => ipcRenderer.invoke('store:saveSettings', s),
}

contextBridge.exposeInMainWorld('cleaner', api)

export type CleanerAPI = typeof api
