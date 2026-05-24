// src/main/ipc/trash.ipc.ts
import { ipcMain, shell } from 'electron'

export function registerTrashIpc(): void {
  ipcMain.handle('trash:files', async (_e, paths: string[]) => {
    const results = await Promise.allSettled(paths.map((p) => shell.trashItem(p)))
    return results.map((r, i) => ({
      path: paths[i],
      success: r.status === 'fulfilled',
      error: r.status === 'rejected' ? (r.reason as Error).message : undefined,
    }))
  })

  ipcMain.handle('trash:reveal', (_e, path: string) => {
    shell.showItemInFolder(path)
  })
}
