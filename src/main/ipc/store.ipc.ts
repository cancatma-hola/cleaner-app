// src/main/ipc/store.ipc.ts
import { ipcMain } from 'electron'
import store from '../store'
import { getDiskInfo } from '../services/disk-info'

export function registerStoreIpc(): void {
  ipcMain.handle('store:getSettings', () => store.get('settings'))
  ipcMain.handle('store:saveSettings', (_e, settings) => {
    store.set('settings', settings)
    return true
  })
  ipcMain.handle('disk:info', () => getDiskInfo())
}
