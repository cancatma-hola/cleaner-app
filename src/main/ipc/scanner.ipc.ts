// src/main/ipc/scanner.ipc.ts
import { ipcMain, BrowserWindow } from 'electron'
import { join } from 'path'
import { createReadStream } from 'fs'
import { createHash } from 'crypto'
import { Worker } from 'worker_threads'
import { WorkerPool } from '../services/worker-pool'
import type { ScanConfig, ScanResult, ScannedFile, DuplicateGroup, SimilarGroup } from '../../renderer/src/types'

let scannerPool: WorkerPool | null = null

export function registerScannerIpc(win: BrowserWindow): void {
  ipcMain.handle('scan:start', async (_e, config: ScanConfig) => {
    console.log('[scan:start] paths:', config.paths)
    if (scannerPool) scannerPool.terminateAll()

    scannerPool = new WorkerPool(join(__dirname, 'file-scanner.worker.js'), 4)

    return new Promise<ScanResult>((resolve, reject) => {
      let scannedFiles: ScannedFile[] = []

      const safeSend = (channel: string, payload: unknown) => {
        try {
          if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
            win.webContents.send(channel, payload)
          }
        } catch { /* render frame disposed */ }
      }

      scannerPool!.on('message', (msg) => {
        if (msg.type === 'progress') {
          safeSend('scan:progress', { phase: 'scanning', ...msg })
        } else if (msg.type === 'result') {
          scannedFiles = msg.files
        }
      })

      scannerPool!.on('error', reject)

      scannerPool!.on('done', async () => {
        try {
          const now = Date.now()
          const thresholdMs = config.unusedThresholdDays * 24 * 60 * 60 * 1000
          const largeSizeBytes = config.largeSizeThresholdMB * 1024 * 1024

          const unused = scannedFiles.filter((f) => now - f.lastAccessed > thresholdMs)
          const large = scannedFiles.filter((f) => f.size > largeSizeBytes)

          // Only hash files sharing the same size (potential duplicates)
          const sizeCount = new Map<number, number>()
          for (const f of scannedFiles) sizeCount.set(f.size, (sizeCount.get(f.size) ?? 0) + 1)
          const hashCandidates = scannedFiles.filter((f) => f.size > 0 && (sizeCount.get(f.size) ?? 0) > 1)

          // Only image-hash image files
          const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.bmp'])
          const imageCandidates = scannedFiles.filter((f) => {
            const dot = f.name.lastIndexOf('.')
            return dot !== -1 && IMAGE_EXTS.has(f.name.slice(dot).toLowerCase())
          })

          safeSend('scan:progress', { phase: 'hashing', hashed: 0, hashTotal: hashCandidates.length })
          const duplicates = await hashFilesInMainProcess(hashCandidates, (hashed, hashTotal) => {
            safeSend('scan:progress', { phase: 'hashing', hashed, hashTotal })
          })

          safeSend('scan:progress', { phase: 'image-hashing', imageHashed: 0, imageHashTotal: imageCandidates.length })
          const similarImages = await runImageHashWorker(imageCandidates, (imageHashed, imageHashTotal) => {
            safeSend('scan:progress', { phase: 'image-hashing', imageHashed, imageHashTotal })
          })

          const result: ScanResult = {
            unused,
            duplicates,
            large,
            similarImages,
            totalWastedBytes: duplicates.reduce((s, g) => s + g.wastedBytes, 0),
            scannedAt: now,
          }

          safeSend('scan:progress', { phase: 'done' })
          resolve(result)
        } catch (err) {
          reject(err)
        }
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

async function hashFilesInMainProcess(
  files: ScannedFile[],
  onProgress?: (hashed: number, total: number) => void
): Promise<DuplicateGroup[]> {
  const bySize = new Map<number, ScannedFile[]>()
  for (const f of files) {
    const arr = bySize.get(f.size) ?? []
    arr.push(f)
    bySize.set(f.size, arr)
  }

  const byHash = new Map<string, ScannedFile[]>()
  let hashed = 0
  for (const group of bySize.values()) {
    if (group.length < 2) continue
    for (const f of group) {
      try {
        const hash = await hashFile(f.path)
        const arr = byHash.get(hash) ?? []
        arr.push(f)
        byHash.set(hash, arr)
      } catch { /* skip unreadable */ }
      hashed++
      onProgress?.(hashed, files.length)
    }
  }

  const result: DuplicateGroup[] = []
  for (const [hash, dupes] of byHash) {
    if (dupes.length < 2) continue
    const sorted = [...dupes].sort((a, b) => a.created - b.created)
    sorted[0].isOriginal = true
    result.push({
      hash,
      files: sorted,
      wastedBytes: (dupes.length - 1) * dupes[0].size,
    })
  }
  return result
}

function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha1')
    const stream = createReadStream(filePath, { highWaterMark: 64 * 1024 })
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

function runImageHashWorker(
  files: ScannedFile[],
  onProgress?: (hashed: number, total: number) => void
): Promise<SimilarGroup[]> {
  if (files.length === 0) return Promise.resolve([])
  return new Promise((resolve, reject) => {
    const worker = new Worker(join(__dirname, 'image-hash.worker.js'), { workerData: { files } })
    worker.on('message', (msg) => {
      if (msg.type === 'progress') onProgress?.(msg.hashed, msg.total)
      else if (msg.type === 'result') resolve(msg.groups)
    })
    worker.on('error', reject)
    worker.on('exit', (code) => { if (code !== 0) reject(new Error(`image-hash worker exited with code ${code}`)) })
  })
}
