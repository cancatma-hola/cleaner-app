// src/main/ipc/system.ipc.ts
import { ipcMain, dialog, BrowserWindow } from 'electron'
import { getSystemInfo } from '../platform'
import { listTargets, analyzeTarget, cleanTarget } from '../services/system-clean'

export function registerSystemIpc(): void {
  ipcMain.handle('system:info', () => getSystemInfo())

  ipcMain.handle('dialog:pickFolders', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const opts = { properties: ['openDirectory', 'multiSelections'] as Array<'openDirectory' | 'multiSelections'> }
    const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    return res.canceled ? [] : res.filePaths
  })

  ipcMain.handle('sysclean:list', () => listTargets())
  ipcMain.handle('sysclean:analyze', (_e, id: string) => analyzeTarget(id))
  ipcMain.handle('sysclean:clean', (_e, id: string) => cleanTarget(id))
}
