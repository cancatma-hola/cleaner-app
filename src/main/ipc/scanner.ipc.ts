// src/main/ipc/scanner.ipc.ts
import { ipcMain, BrowserWindow } from 'electron'
import { join } from 'path'
import { WorkerPool } from '../services/worker-pool'
import type { ScanConfig, ScanResult, ScannedFile, DuplicateGroup, SimilarGroup } from '../../renderer/src/types'

let scannerPool: WorkerPool | null = null

export function registerScannerIpc(win: BrowserWindow): void {
  ipcMain.handle('scan:start', async (_e, config: ScanConfig) => {
    if (scannerPool) scannerPool.terminateAll()

    scannerPool = new WorkerPool(
      join(__dirname, 'file-scanner.worker.js'),
      4,
    )

    return new Promise<ScanResult>((resolve) => {
      let scannedFiles: ScannedFile[] = []

      scannerPool!.on('message', (msg) => {
        if (msg.type === 'progress') {
          win.webContents.send('scan:progress', msg)
        } else if (msg.type === 'result') {
          scannedFiles = msg.files
        }
      })

      scannerPool!.on('done', async () => {
        const now = Date.now()
        const thresholdMs = config.unusedThresholdDays * 24 * 60 * 60 * 1000
        const largeSizeBytes = config.largeSizeThresholdMB * 1024 * 1024

        const unused = scannedFiles.filter((f) => now - f.lastAccessed > thresholdMs)
        const large = scannedFiles.filter((f) => f.size > largeSizeBytes)

        // Only hash files that share the same size (potential duplicates) — skip unique sizes
        const sizeCount = new Map<number, number>()
        for (const f of scannedFiles) sizeCount.set(f.size, (sizeCount.get(f.size) ?? 0) + 1)
        const hashCandidates = scannedFiles.filter((f) => f.size > 0 && (sizeCount.get(f.size) ?? 0) > 1)

        // Only run image hash on image files
        const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.bmp'])
        const imageCandidates = scannedFiles.filter((f) => {
          const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
          return IMAGE_EXTS.has(ext)
        })

        win.webContents.send('scan:progress', { phase: 'hashing' })
        const hashResult = await runHashWorker(hashCandidates)

        win.webContents.send('scan:progress', { phase: 'image-hashing' })
        const imageResult = await runImageHashWorker(imageCandidates)

        const result: ScanResult = {
          unused,
          duplicates: hashResult.groups,
          large,
          similarImages: imageResult.groups,
          totalWastedBytes: hashResult.groups.reduce((s, g) => s + g.wastedBytes, 0),
          scannedAt: now,
        }

        win.webContents.send('scan:progress', { phase: 'done' })
        resolve(result)
      })

      scannerPool!.run({
        paths: config.paths,
        excludePatterns: config.excludePatterns,
        includeHidden: config.includeHidden,
      })
    })
  })

  ipcMain.handle('scan:stop', () => {
    scannerPool?.terminateAll()
    scannerPool = null
  })
}

function runHashWorker(files: ScannedFile[]): Promise<{ groups: DuplicateGroup[] }> {
  return new Promise((resolve) => {
    const pool = new WorkerPool(join(__dirname, 'hash.worker.js'), 2)
    let groups: DuplicateGroup[] = []
    pool.on('message', (msg) => { if (msg.type === 'result') groups = msg.groups })
    pool.on('done', () => resolve({ groups }))
    pool.run({ files })
  })
}

function runImageHashWorker(files: ScannedFile[]): Promise<{ groups: SimilarGroup[] }> {
  return new Promise((resolve) => {
    const pool = new WorkerPool(join(__dirname, 'image-hash.worker.js'), 2)
    let groups: SimilarGroup[] = []
    pool.on('message', (msg) => { if (msg.type === 'result') groups = msg.groups })
    pool.on('done', () => resolve({ groups }))
    pool.run({ files })
  })
}
