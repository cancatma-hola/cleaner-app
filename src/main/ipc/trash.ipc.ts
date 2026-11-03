// src/main/ipc/trash.ipc.ts
import { ipcMain, shell } from 'electron'
import { execFile } from 'child_process'
import { rename, access } from 'fs/promises'
import { join, basename, extname } from 'path'
import { homedir } from 'os'

async function trashItem(p: string): Promise<void> {
  // Network shares have no Recycle Bin — Windows would delete permanently.
  if (process.platform === 'win32' && (p.startsWith('\\\\') || p.startsWith('//'))) {
    throw new Error('Ağ konumlarında Geri Dönüşüm Kutusu yok; dosya silinmedi')
  }
  // 1. Native Electron trash (macOS Trash / Windows Recycle Bin / freedesktop Trash)
  try {
    await shell.trashItem(p)
    return
  } catch (err) {
    // The fallbacks below are macOS-only. On Windows/Linux we never fall back to a
    // permanent delete — the failure is reported to the user instead.
    if (process.platform !== 'darwin') throw err
  }

  // 2. AppleScript / Finder (works for iCloud Drive on most volumes)
  try {
    await new Promise<void>((resolve, reject) => {
      const escaped = p.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      execFile('/usr/bin/osascript', ['-e', `tell app "Finder" to delete POSIX file "${escaped}"`], (err) => {
        if (err) reject(err); else resolve()
      })
    })
    return
  } catch { /* try next */ }

  // 3. Direct mv to ~/.Trash (bypasses Finder; handles -36 / network / partial-download files)
  const trashDir = join(homedir(), '.Trash')
  const name = basename(p)
  let dest = join(trashDir, name)
  const collision = await access(dest).then(() => true).catch(() => false)
  if (collision) {
    const ext = extname(name)
    const base = name.slice(0, name.length - ext.length)
    dest = join(trashDir, `${base}_${Date.now()}${ext}`)
  }
  await rename(p, dest)
}

export function registerTrashIpc(): void {
  ipcMain.handle('trash:files', async (_e, paths: string[]) => {
    return Promise.all(
      paths.map(async (p) => {
        try {
          await trashItem(p)
          console.log('  OK:', p)
          return { path: p, success: true }
        } catch (err) {
          console.log('  FAIL:', p, '--', (err as Error).message)
          return { path: p, success: false, error: (err as Error).message }
        }
      })
    )
  })

  ipcMain.handle('trash:reveal', (_e, path: string) => {
    shell.showItemInFolder(path)
  })
}
